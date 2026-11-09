import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.graph import ImpactEvent
from app.models.knowledge import KnowledgeItem, KnowledgeSource, KnowledgeVersion
from app.schemas.contracts import RetrievedItem, RetrievedKnowledge
from app.schemas.enums import EntityType, KnowledgeType, Relation
from app.services import audit, graph
from app.services.embeddings import EmbeddingService

IMPACT_SEVERITY = {
    "FACT": "HIGH",
    "CLAIM": "HIGH",
    "POLICY": "MEDIUM",
    "GUIDELINE": "MEDIUM",
    "VOICE_RULE": "LOW",
    "TERM": "MEDIUM",
    "PROHIBITED_TERM": "MEDIUM",
    "VISUAL_ASSET": "MEDIUM",
}
DETERMINISTIC_TYPES = {"TERM", "PROHIBITED_TERM", "POLICY", "VOICE_RULE"}


def create_item(
    db: Session,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    type_: str,
    title: str,
    body: str,
    structured: dict | None = None,
    source_id: uuid.UUID | None = None,
    auto_approve: bool = False,
) -> KnowledgeItem:
    item = KnowledgeItem(
        org_id=org_id,
        source_id=source_id,
        type=type_,
        title=title,
        body=body,
        structured=structured or {},
        status="APPROVED" if auto_approve else "PENDING",
        current_version=1,
        created_by=user_id,
        approved_by=user_id if auto_approve else None,
    )
    db.add(item)
    db.flush()
    version = KnowledgeVersion(
        org_id=org_id, item_id=item.id, version=1, body=body,
        structured=structured or {}, change_note="Initial version", created_by=user_id,
    )
    db.add(version)
    db.flush()
    if auto_approve:
        _activate_item(db, item, version)
    audit.record(db, org_id, user_id, "knowledge.item_created", "knowledge_item", item.id,
                 {"type": type_, "title": title, "status": item.status})
    return item


def _activate_item(db: Session, item: KnowledgeItem, version: KnowledgeVersion) -> None:
    EmbeddingService().embed_version(db, version)
    node = graph.item_node(db, item.org_id, item)
    if item.source_id:
        source = db.get(KnowledgeSource, item.source_id)
        if source:
            src_node = graph.upsert_node(db, item.org_id, EntityType.SOURCE_DOCUMENT.value, source.id, source.title)
            graph.add_edge(db, item.org_id, node, src_node, Relation.DERIVED_FROM.value,
                           {"why": "extracted from uploaded source", "source_id": str(source.id)})


def approve_item(db: Session, org_id: uuid.UUID, user_id: uuid.UUID, item: KnowledgeItem) -> KnowledgeItem:
    item.status = "APPROVED"
    item.approved_by = user_id
    version = (
        db.query(KnowledgeVersion)
        .filter(KnowledgeVersion.item_id == item.id, KnowledgeVersion.version == item.current_version)
        .first()
    )
    _activate_item(db, item, version)
    audit.record(db, org_id, user_id, "knowledge.item_approved", "knowledge_item", item.id,
                 {"version": item.current_version})
    return item


def reject_item(db: Session, org_id: uuid.UUID, user_id: uuid.UUID, item: KnowledgeItem) -> KnowledgeItem:
    item.status = "REJECTED"
    audit.record(db, org_id, user_id, "knowledge.item_rejected", "knowledge_item", item.id)
    return item


def create_version(
    db: Session,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    item: KnowledgeItem,
    body: str,
    structured: dict | None,
    change_note: str,
) -> tuple[KnowledgeVersion, ImpactEvent | None]:
    old = (
        db.query(KnowledgeVersion)
        .filter(KnowledgeVersion.item_id == item.id, KnowledgeVersion.version == item.current_version)
        .first()
    )
    if old:
        old.superseded = True
    new_version = KnowledgeVersion(
        org_id=org_id, item_id=item.id, version=item.current_version + 1,
        body=body, structured=structured if structured is not None else item.structured,
        change_note=change_note, created_by=user_id,
    )
    item.body = body
    if structured is not None:
        item.structured = structured
    item.current_version = new_version.version
    db.add(new_version)
    db.flush()

    impact = None
    if item.status == "APPROVED":
        _activate_item(db, item, new_version)
        node = graph.item_node(db, org_id, item)
        dependents = graph.traverse_dependents(db, org_id, node.id)
        affected = [
            d for d in dependents
            if d["entity_type"] in ("CONTENT_ITEM", "CONTENT_VERSION", "REVIEW")
        ]
        impact = ImpactEvent(
            org_id=org_id, item_id=item.id, from_version=old.version if old else 0,
            to_version=new_version.version,
            change_summary=change_note or f"{item.title} updated to version {new_version.version}",
            severity=IMPACT_SEVERITY.get(item.type, "MEDIUM"),
            affected_count=len({d["ref_id"] for d in affected}),
        )
        db.add(impact)
        db.flush()
        audit.record(db, org_id, user_id, "knowledge.impact_created", "impact_event", impact.id,
                     {"item_id": str(item.id), "affected": impact.affected_count})
    audit.record(db, org_id, user_id, "knowledge.version_created", "knowledge_item", item.id,
                 {"version": new_version.version, "change_note": change_note})
    return new_version, impact


def retrieve_knowledge(db: Session, org_id: uuid.UUID, query: str, k: int = 8) -> RetrievedKnowledge:
    service = EmbeddingService()
    results: dict[uuid.UUID, RetrievedItem] = {}
    try:
        for version, score in service.search(db, org_id, query[:4000], k=k):
            item = db.get(KnowledgeItem, version.item_id)
            results[item.id] = RetrievedItem(
                item_id=str(item.id), version=version.version, type=item.type,
                title=item.title, body=version.body, structured=version.structured, score=round(score, 4),
            )
    except Exception:
        pass  # semantic retrieval optional; deterministic rules below are mandatory
    rules = (
        db.query(KnowledgeItem)
        .filter(KnowledgeItem.org_id == org_id, KnowledgeItem.status == "APPROVED",
                KnowledgeItem.type.in_(DETERMINISTIC_TYPES))
        .all()
    )
    for item in rules:
        if item.id not in results:
            results[item.id] = RetrievedItem(
                item_id=str(item.id), version=item.current_version, type=item.type,
                title=item.title, body=item.body, structured=item.structured, score=1.0,
            )
    return RetrievedKnowledge(
        items=list(results.values()),
        knowledge_snapshot={str(iid): r.version for iid, r in results.items()},
    )