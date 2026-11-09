import hashlib
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.agents.orchestrator import reset_for_rerun
from app.core.deps import get_db, get_org, require_roles
from app.models.content import ContentItem, ContentVersion, UploadedFile
from app.models.identity import utcnow
from app.models.review import (
    AgentRun,
    CorrectionSuggestion,
    EvidenceReference,
    Review,
    ReviewDecision,
    ReviewFinding,
)
from app.schemas.api import (
    AgentRunOut,
    CorrectionOut,
    DecisionIn,
    EvidenceOut,
    FindingOut,
    RerunIn,
    ReviewCreate,
    ReviewOut,
)
from app.schemas.enums import Decision, EntityType, Relation, ReviewStatus, Role
from app.services import audit, graph
from app.services.jobs import dispatch_review

router = APIRouter(prefix="/reviews", tags=["reviews"])

ACTIVE_STATUSES = {s.value for s in ReviewStatus if s not in (ReviewStatus.COMPLETED, ReviewStatus.FAILED)}


def _get_review(db: Session, org_id: uuid.UUID, review_id: uuid.UUID) -> Review:
    review = db.get(Review, review_id)
    if not review or review.org_id != org_id:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


def _content(db: Session, review: Review) -> tuple[ContentItem, ContentVersion]:
    version = db.get(ContentVersion, review.content_version_id)
    item = db.get(ContentItem, version.content_id)
    return item, version


@router.post("", response_model=ReviewOut)
def create_review(payload: ReviewCreate, ctx=Depends(require_roles(Role.ADMIN, Role.EDITOR)),
                  db: Session = Depends(get_db)):
    if payload.input_type not in ("TEXT", "IMAGE", "DOCUMENT"):
        raise HTTPException(status_code=400, detail="input_type must be TEXT, IMAGE or DOCUMENT")
    if payload.input_type == "TEXT" and not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text is required for TEXT submissions")
    file_record = None
    if payload.file_id:
        file_record = db.get(UploadedFile, payload.file_id)
        if not file_record or file_record.org_id != ctx.org_id:
            raise HTTPException(status_code=404, detail="File not found")
    if payload.input_type in ("IMAGE", "DOCUMENT") and not file_record:
        raise HTTPException(status_code=400, detail="file_id is required for IMAGE and DOCUMENT submissions")

    item = ContentItem(
        org_id=ctx.org_id, title=payload.title, input_type=payload.input_type,
        channel=payload.channel, content_type=payload.content_type, audience=payload.audience,
        campaign=payload.campaign, context=payload.context, created_by=ctx.user.id,
    )
    db.add(item)
    db.flush()
    digest = hashlib.sha256(
        (payload.raw_text or (file_record.sha256 if file_record else "")).encode()
    ).hexdigest()
    version = ContentVersion(
        org_id=ctx.org_id, content_id=item.id, version=1, raw_text=payload.raw_text,
        canonical={}, file_id=payload.file_id, sha256=digest,
    )
    db.add(version)
    db.flush()
    review = Review(org_id=ctx.org_id, content_version_id=version.id, created_by=ctx.user.id)
    db.add(review)
    db.flush()
    ci_node = graph.upsert_node(db, ctx.org_id, EntityType.CONTENT_ITEM.value, item.id, item.title)
    cv_node = graph.upsert_node(db, ctx.org_id, EntityType.CONTENT_VERSION.value, version.id,
                                f"{item.title} v1")
    graph.add_edge(db, ctx.org_id, cv_node, ci_node, Relation.DERIVED_FROM.value,
                   {"why": "submitted for review", "review_id": str(review.id)})
    audit.record(db, ctx.org_id, ctx.user.id, "review.submitted", "review", review.id,
                 {"input_type": payload.input_type, "title": payload.title})
    db.commit()
    dispatch_review(review.id)
    return review


@router.get("")
def list_reviews(status: str | None = Query(None), limit: int = Query(50, le=200),
                 ctx=Depends(get_org), db: Session = Depends(get_db)):
    q = db.query(Review).filter(Review.org_id == ctx.org_id)
    if status:
        q = q.filter(Review.status == status)
    reviews = q.order_by(Review.created_at.desc()).limit(limit).all()
    out = []
    for r in reviews:
        item, version = _content(db, r)
        out.append({
            **ReviewOut.model_validate(r).model_dump(),
            "title": item.title, "input_type": item.input_type,
            "channel": item.channel, "version": version.version,
        })
    return out


@router.get("/{review_id}")
def get_review(review_id: uuid.UUID, ctx=Depends(get_org), db: Session = Depends(get_db)):
    review = _get_review(db, ctx.org_id, review_id)
    item, version = _content(db, review)
    agents = (
        db.query(AgentRun).filter(AgentRun.review_id == review.id).order_by(AgentRun.agent_id).all()
    )
    findings = db.query(ReviewFinding).filter(ReviewFinding.review_id == review.id).all()
    finding_ids = [f.id for f in findings]
    evidence = (
        db.query(EvidenceReference).filter(EvidenceReference.finding_id.in_(finding_ids)).all()
        if finding_ids else []
    )
    corrections = (
        db.query(CorrectionSuggestion).filter(CorrectionSuggestion.review_id == review.id).all()
    )
    decisions = (
        db.query(ReviewDecision).filter(ReviewDecision.review_id == review.id)
        .order_by(ReviewDecision.created_at.desc()).all()
    )
    ev_by_finding: dict[uuid.UUID, list] = {}
    for e in evidence:
        ev_by_finding.setdefault(e.finding_id, []).append(EvidenceOut.model_validate(e).model_dump())
    return {
        "review": ReviewOut.model_validate(review).model_dump(),
        "content": {
            "id": str(item.id), "title": item.title, "input_type": item.input_type,
            "channel": item.channel, "content_type": item.content_type, "audience": item.audience,
            "campaign": item.campaign, "context": item.context,
            "version": version.version, "raw_text": version.raw_text,
            "canonical": version.canonical, "file_id": str(version.file_id) if version.file_id else None,
        },
        "agents": [AgentRunOut.model_validate(a).model_dump() for a in agents],
        "findings": [
            {**FindingOut.model_validate(f).model_dump(), "evidence": ev_by_finding.get(f.id, [])}
            for f in findings
        ],
        "corrections": [CorrectionOut.model_validate(c).model_dump() for c in corrections],
        "decisions": [
            {"id": str(d.id), "decision": d.decision, "reason": d.reason,
             "override_critical": d.override_critical, "decided_by": str(d.decided_by),
             "created_at": d.created_at.isoformat()}
            for d in decisions
        ],
    }


@router.post("/{review_id}/rerun", response_model=ReviewOut)
def rerun_review(review_id: uuid.UUID, payload: RerunIn,
                 ctx=Depends(require_roles(Role.ADMIN, Role.EDITOR)), db: Session = Depends(get_db)):
    review = _get_review(db, ctx.org_id, review_id)
    if review.status in ACTIVE_STATUSES - {ReviewStatus.AWAITING_REVIEW.value}:
        raise HTTPException(status_code=409, detail="Review is still running")
    item, version = _content(db, review)
    if payload.raw_text is not None and payload.raw_text.strip():
        item.current_version += 1
        new_version = ContentVersion(
            org_id=ctx.org_id, content_id=item.id, version=item.current_version,
            raw_text=payload.raw_text, canonical={}, file_id=version.file_id,
            sha256=hashlib.sha256(payload.raw_text.encode()).hexdigest(),
        )
        db.add(new_version)
        db.flush()
        review.content_version_id = new_version.id
        cv_node = graph.upsert_node(db, ctx.org_id, EntityType.CONTENT_VERSION.value, new_version.id,
                                    f"{item.title} v{new_version.version}")
        ci_node = graph.upsert_node(db, ctx.org_id, EntityType.CONTENT_ITEM.value, item.id, item.title)
        graph.add_edge(db, ctx.org_id, cv_node, ci_node, Relation.DERIVED_FROM.value,
                       {"why": "revised submission", "review_id": str(review.id)})
    reset_for_rerun(db, review)
    review.decision = None
    review.decision_reason = None
    review.decided_by = None
    review.decided_at = None
    audit.record(db, ctx.org_id, ctx.user.id, "review.rerun", "review", review.id,
                 {"new_text": payload.raw_text is not None})
    db.commit()
    dispatch_review(review.id)
    return review


@router.post("/{review_id}/corrections/{correction_id}", response_model=CorrectionOut)
def decide_correction(review_id: uuid.UUID, correction_id: uuid.UUID, accept: bool = Query(...),
                      ctx=Depends(require_roles(Role.ADMIN, Role.REVIEWER, Role.EDITOR)),
                      db: Session = Depends(get_db)):
    _get_review(db, ctx.org_id, review_id)
    correction = db.get(CorrectionSuggestion, correction_id)
    if not correction or correction.review_id != review_id or correction.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Correction not found")
    correction.status = "ACCEPTED" if accept else "REJECTED"
    correction.decided_by = ctx.user.id
    correction.decided_at = utcnow()
    audit.record(db, ctx.org_id, ctx.user.id, "review.correction_decided", "correction_suggestion",
                 correction.id, {"accept": accept})
    db.commit()
    return correction


@router.post("/{review_id}/decision", response_model=ReviewOut)
def decide_review(review_id: uuid.UUID, payload: DecisionIn,
                  ctx=Depends(require_roles(Role.ADMIN, Role.REVIEWER)), db: Session = Depends(get_db)):
    review = _get_review(db, ctx.org_id, review_id)
    if review.status != ReviewStatus.AWAITING_REVIEW.value:
        raise HTTPException(status_code=409, detail=f"Review is not awaiting human review (status: {review.status})")
    if payload.decision == Decision.APPROVE:
        critical = (
            db.query(ReviewFinding)
            .filter(ReviewFinding.review_id == review.id, ReviewFinding.severity == "CRITICAL",
                    ReviewFinding.dedupe_of.is_(None),
                    ReviewFinding.status.notin_(["SUPPORTED", "NOT_APPLICABLE", "INFO"]))
            .count()
        )
        if critical and not payload.override_critical:
            raise HTTPException(
                status_code=409,
                detail=f"{critical} unresolved CRITICAL finding(s). Set override_critical=true with a reason to approve anyway.",
            )
        if critical and not payload.reason.strip():
            raise HTTPException(status_code=400, detail="A reason is required when overriding critical findings")
    decision = ReviewDecision(
        org_id=ctx.org_id, review_id=review.id, decision=payload.decision.value,
        reason=payload.reason, override_critical=payload.override_critical, decided_by=ctx.user.id,
    )
    db.add(decision)
    db.flush()
    review.decision = payload.decision.value
    review.decision_reason = payload.reason
    review.decided_by = ctx.user.id
    review.decided_at = utcnow()
    review.status = ReviewStatus.COMPLETED.value
    item, version = _content(db, review)
    d_node = graph.upsert_node(db, ctx.org_id, EntityType.APPROVAL_DECISION.value, decision.id,
                               f"{payload.decision.value}: {item.title}")
    r_node = graph.upsert_node(db, ctx.org_id, EntityType.REVIEW.value, review.id,
                               f"Review of {item.title}")
    graph.add_edge(db, ctx.org_id, d_node, r_node, Relation.APPLIES_TO.value,
                   {"why": payload.reason or "human decision", "decided_by": str(ctx.user.id)})
    if payload.decision == Decision.APPROVE:
        cv_node = graph.upsert_node(db, ctx.org_id, EntityType.CONTENT_VERSION.value, version.id,
                                    f"{item.title} v{version.version}")
        graph.add_edge(db, ctx.org_id, cv_node, d_node, Relation.APPROVED_UNDER.value,
                       {"decision_id": str(decision.id), "decided_by": str(ctx.user.id)})
    audit.record(db, ctx.org_id, ctx.user.id, "review.decided", "review", review.id,
                 {"decision": payload.decision.value, "override_critical": payload.override_critical,
                  "reason": payload.reason})
    db.commit()
    return review