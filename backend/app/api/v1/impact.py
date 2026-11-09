import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_org, require_roles
from app.models.content import ContentVersion
from app.models.graph import GraphNode, ImpactEvent
from app.models.identity import utcnow
from app.models.review import Review
from app.schemas.api import ImpactEventOut, ReviewOut
from app.schemas.enums import Role
from app.services import audit, graph
from app.services.jobs import dispatch_review

router = APIRouter(prefix="/impact-events", tags=["impact"])


@router.get("", response_model=list[ImpactEventOut])
def list_impact_events(status: str | None = Query(None), ctx=Depends(get_org),
                       db: Session = Depends(get_db)):
    q = db.query(ImpactEvent).filter(ImpactEvent.org_id == ctx.org_id)
    if status:
        q = q.filter(ImpactEvent.status == status)
    return q.order_by(ImpactEvent.created_at.desc()).all()


@router.post("/{event_id}/reassess")
def reassess(event_id: uuid.UUID, ctx=Depends(require_roles(Role.ADMIN, Role.REVIEWER)),
             db: Session = Depends(get_db)):
    event = db.get(ImpactEvent, event_id)
    if not event or event.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Impact event not found")
    if event.status == "RESOLVED":
        raise HTTPException(status_code=409, detail="Impact event already resolved")
    node = (
        db.query(GraphNode)
        .filter(GraphNode.org_id == ctx.org_id, GraphNode.ref_id == event.item_id)
        .first()
    )
    created: list[Review] = []
    if node:
        deps = graph.traverse_dependents(db, ctx.org_id, node.id)
        version_ids = {
            d["ref_id"] for d in deps if d["entity_type"] == "CONTENT_VERSION" and d["ref_id"]
        }
        for vid in version_ids:
            version = db.get(ContentVersion, vid)
            if not version or version.org_id != ctx.org_id:
                continue
            review = Review(org_id=ctx.org_id, content_version_id=version.id, created_by=ctx.user.id)
            db.add(review)
            db.flush()
            created.append(review)
    event.status = "REASSESSING"
    audit.record(db, ctx.org_id, ctx.user.id, "impact.reassess_started", "impact_event", event.id,
                 {"new_reviews": len(created)})
    db.commit()
    for review in created:
        dispatch_review(review.id)
    return {"event_id": str(event.id), "new_reviews": [str(r.id) for r in created]}


@router.post("/{event_id}/resolve", response_model=ImpactEventOut)
def resolve(event_id: uuid.UUID, ctx=Depends(require_roles(Role.ADMIN, Role.REVIEWER)),
            db: Session = Depends(get_db)):
    event = db.get(ImpactEvent, event_id)
    if not event or event.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Impact event not found")
    event.status = "RESOLVED"
    event.resolved_at = utcnow()
    audit.record(db, ctx.org_id, ctx.user.id, "impact.resolved", "impact_event", event.id)
    db.commit()
    return event