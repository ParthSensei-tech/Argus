import uuid
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy.orm import Session

from app.agents import a1_intake, a2_knowledge, a3_claims, a4_policy, a5_visual, a6_adjudication, a7_correction
from app.agents.base import run_agent
from app.db.session import SessionLocal
from app.models.content import ContentItem, ContentVersion, UploadedFile
from app.models.graph import GraphEdge, GraphNode
from app.models.knowledge import KnowledgeItem
from app.models.review import (
    AgentOutput,
    AgentRun,
    CorrectionSuggestion,
    EvidenceReference,
    Review,
    ReviewFinding,
)
from app.schemas.contracts import (
    AdjudicationOutput,
    CanonicalContent,
    CorrectionOutput,
    RetrievedKnowledge,
)
from app.schemas.enums import EntityType, Relation, ReviewStatus
from app.services import audit, graph
from app.services.storage import get_storage


def _payload(db: Session, run: AgentRun) -> dict:
    out = db.query(AgentOutput).filter(AgentOutput.agent_run_id == run.id).first()
    return out.payload if out else {}


def _set_status(db: Session, review: Review, status: ReviewStatus) -> None:
    review.status = status.value
    db.commit()


def _persist_results(
    db: Session,
    review: Review,
    item: ContentItem,
    version: ContentVersion,
    adjudication: AdjudicationOutput,
    corrections: CorrectionOutput,
) -> None:
    key_to_id: dict[str, uuid.UUID] = {}
    cited_items: set[str] = set()
    for f in adjudication.consolidated:
        if not f.kept:
            continue
        finding = ReviewFinding(
            org_id=review.org_id, review_id=review.id, agent_id=int(f.finding_key[1]) if f.finding_key else 0,
            category=f.category.value, severity=f.severity.value, status=f.status.value,
            confidence=f.confidence, original_text=f.original_text,
            source_location=f.source_location.model_dump(), explanation=f.explanation,
            policy_reference=f.policy_reference, suggested_correction=f.suggested_correction,
            human_action_required=f.human_action_required, resolution_note=f.resolution_note,
        )
        db.add(finding)
        db.flush()
        key_to_id[f.finding_key] = finding.id
        for e in f.evidence:
            if not e.knowledge_item_id:
                continue
            try:
                ki = db.get(KnowledgeItem, uuid.UUID(e.knowledge_item_id))
            except (ValueError, TypeError):
                continue
            if not ki or ki.org_id != review.org_id:
                continue
            db.add(EvidenceReference(
                org_id=review.org_id, finding_id=finding.id, knowledge_item_id=ki.id,
                knowledge_version=e.knowledge_version, source_document_id=ki.source_id,
                source_location=e.source_location, excerpt=e.excerpt, relation=e.relation,
            ))
            cited_items.add(str(ki.id))
    for c in corrections.corrections:
        finding_id = key_to_id.get(c.finding_key) or next(iter(key_to_id.values()), None)
        if not finding_id:
            continue
        db.add(CorrectionSuggestion(
            org_id=review.org_id, review_id=review.id, finding_id=finding_id,
            original_text=c.original_text,
            suggested_text="" if c.no_safe_correction else c.suggested_text,
            explanation=("[No safe automatic correction] " if c.no_safe_correction else "") + c.explanation,
        ))

    ci_node = graph.upsert_node(db, review.org_id, EntityType.CONTENT_ITEM.value, item.id, item.title)
    cv_node = graph.upsert_node(db, review.org_id, EntityType.CONTENT_VERSION.value, version.id,
                                f"{item.title} v{version.version}")
    review_node = graph.upsert_node(db, review.org_id, EntityType.REVIEW.value, review.id,
                                    f"Review of {item.title}")
    prov = {"review_id": str(review.id), "established_by": "orchestrator"}
    graph.add_edge(db, review.org_id, cv_node, ci_node, Relation.DERIVED_FROM.value, prov)
    graph.add_edge(db, review.org_id, cv_node, review_node, Relation.REVIEWED_UNDER.value, prov)
    for finding in db.query(ReviewFinding).filter(ReviewFinding.review_id == review.id).all():
        f_node = graph.upsert_node(db, review.org_id, EntityType.FINDING.value, finding.id,
                                   finding.explanation[:120] or finding.category)
        graph.add_edge(db, review.org_id, f_node, cv_node, Relation.APPLIES_TO.value, prov)
        for e in db.query(EvidenceReference).filter(EvidenceReference.finding_id == finding.id).all():
            if not e.knowledge_item_id:
                continue
            ki = db.get(KnowledgeItem, e.knowledge_item_id)
            if not ki:
                continue
            k_node = graph.item_node(db, review.org_id, ki)
            rel = Relation.CONTRADICTS.value if e.relation == "CONTRADICTS" else Relation.SUPPORTED_BY.value
            graph.add_edge(db, review.org_id, f_node, k_node, rel,
                           {**prov, "why": e.excerpt[:300], "knowledge_version": e.knowledge_version})
            graph.add_edge(db, review.org_id, review_node, k_node, Relation.REVIEWED_UNDER.value,
                           {**prov, "knowledge_version": e.knowledge_version})
    db.commit()


def execute_review(db: Session, review_id: uuid.UUID) -> None:
    review = db.get(Review, review_id)
    if not review:
        return
    try:
        version = db.get(ContentVersion, review.content_version_id)
        item = db.get(ContentItem, version.content_id)
        file = db.get(UploadedFile, version.file_id) if version.file_id else None
        storage = get_storage()

        _set_status(db, review, ReviewStatus.EXTRACTING)
        run1 = run_agent(db, review, 1, lambda: a1_intake.run(db, review, version, file, storage))
        canonical = CanonicalContent.model_validate(_payload(db, run1))
        if canonical.extraction_status == "FAILED":
            raise RuntimeError(f"Content extraction failed: {'; '.join(canonical.warnings)}")

        _set_status(db, review, ReviewStatus.LOADING_KNOWLEDGE)
        run2 = run_agent(db, review, 2, lambda: a2_knowledge.run(db, review, canonical))
        knowledge = RetrievedKnowledge.model_validate(_payload(db, run2))

        _set_status(db, review, ReviewStatus.ANALYZING)

        def specialist(agent_id: int):
            session = SessionLocal()
            try:
                r = session.get(Review, review_id)
                if agent_id == 3:
                    fn = lambda: a3_claims.run(session, r, canonical, knowledge)
                elif agent_id == 4:
                    fn = lambda: a4_policy.run(session, r, canonical, knowledge, item.channel)
                else:
                    fn = lambda: a5_visual.run(session, r, canonical, knowledge, storage)
                run = run_agent(session, r, agent_id, fn, applicable=(agent_id != 5 or bool(canonical.images)))
                return agent_id, run.status, _payload(session, run)
            except Exception as exc:
                return agent_id, "FAILED", {"error": str(exc)}
            finally:
                session.close()

        with ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(specialist, [3, 4, 5]))
        failed = [f"Agent {aid}: {payload.get('error', 'failed')}" for aid, status, payload in results if status == "FAILED"]
        if failed:
            raise RuntimeError("Specialist stage failed: " + " | ".join(failed))
        payloads = [payload for _, status, payload in results if status == "SUCCESS"]

        _set_status(db, review, ReviewStatus.RESOLVING)
        run6 = run_agent(db, review, 6, lambda: a6_adjudication.run(db, review, payloads))
        adjudication = AdjudicationOutput.model_validate(_payload(db, run6))

        _set_status(db, review, ReviewStatus.CORRECTING)
        intent = {"channel": item.channel, "audience": item.audience, "campaign": item.campaign,
                  "content_type": item.content_type, "context": item.context}
        run7 = run_agent(db, review, 7, lambda: a7_correction.run(db, review, canonical, adjudication, knowledge, intent))
        corrections = CorrectionOutput.model_validate(_payload(db, run7))

        _persist_results(db, review, item, version, adjudication, corrections)
        runs = db.query(AgentRun).filter(AgentRun.review_id == review.id).all()
        review.ai_mode = "dev" if any(r.model in (None, "dev-mode") for r in runs if r.agent_id in (3, 4, 5, 6, 7)) else "live"
        review.risk = adjudication.risk.value
        review.status = ReviewStatus.AWAITING_REVIEW.value
        db.commit()
        audit.record(db, review.org_id, review.created_by, "review.completed", "review", review.id,
                     {"risk": review.risk, "ai_mode": review.ai_mode, "correlation_id": review.correlation_id})
        db.commit()
    except Exception as exc:
        db.rollback()
        review = db.get(Review, review_id)
        review.status = ReviewStatus.FAILED.value
        review.error = str(exc)[:2000]
        db.commit()
        audit.record(db, review.org_id, review.created_by, "review.failed", "review", review.id, {"error": review.error})
        db.commit()


def reset_for_rerun(db: Session, review: Review) -> None:
    finding_ids = [f.id for f in db.query(ReviewFinding).filter(ReviewFinding.review_id == review.id).all()]
    if finding_ids:
        db.query(EvidenceReference).filter(EvidenceReference.finding_id.in_(finding_ids)).delete()
        db.query(CorrectionSuggestion).filter(CorrectionSuggestion.finding_id.in_(finding_ids)).delete()
        nodes = db.query(GraphNode).filter(GraphNode.entity_type == "FINDING", GraphNode.ref_id.in_(finding_ids)).all()
        node_ids = [n.id for n in nodes]
        if node_ids:
            db.query(GraphEdge).filter((GraphEdge.src_id.in_(node_ids)) | (GraphEdge.dst_id.in_(node_ids))).delete()
            db.query(GraphNode).filter(GraphNode.id.in_(node_ids)).delete()
        db.query(ReviewFinding).filter(ReviewFinding.id.in_(finding_ids)).delete()
    run_ids = [r.id for r in db.query(AgentRun).filter(AgentRun.review_id == review.id).all()]
    if run_ids:
        db.query(AgentOutput).filter(AgentOutput.agent_run_id.in_(run_ids)).delete()
        db.query(AgentRun).filter(AgentRun.id.in_(run_ids)).delete()
    review.status = ReviewStatus.QUEUED.value
    review.risk = None
    review.error = None
    db.commit()