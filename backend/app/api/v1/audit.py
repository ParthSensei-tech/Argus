import hashlib
import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.audit import AuditEvent
from app.models.identity import User
from app.schemas.enums import Role

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
def list_audit(limit: int = Query(100, le=500), ctx=Depends(require_roles(Role.ADMIN, Role.REVIEWER)),
               db: Session = Depends(get_db)):
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.org_id == ctx.org_id)
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    actor_ids = {e.actor_id for e in events if e.actor_id}
    actors = {u.id: u.full_name for u in db.query(User).filter(User.id.in_(actor_ids)).all()} if actor_ids else {}
    return [
        {"id": str(e.id), "action": e.action, "entity_type": e.entity_type,
         "entity_id": str(e.entity_id) if e.entity_id else None,
         "actor": actors.get(e.actor_id, "system"), "payload": e.payload,
         "hash": e.hash[:16], "created_at": e.created_at.isoformat()}
        for e in events
    ]


@router.get("/verify")
def verify_chain(ctx=Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)):
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.org_id == ctx.org_id)
        .order_by(AuditEvent.created_at.asc())
        .all()
    )
    prev = ""
    for e in events:
        body = {
            "org_id": str(e.org_id),
            "actor_id": str(e.actor_id) if e.actor_id else None,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": str(e.entity_id) if e.entity_id else None,
            "payload": e.payload or {},
        }
        expected = hashlib.sha256((prev + json.dumps(body, sort_keys=True, default=str)).encode()).hexdigest()
        if e.prev_hash != prev or e.hash != expected:
            return {"valid": False, "broken_at": str(e.id), "checked": len(events)}
        prev = e.hash
    return {"valid": True, "checked": len(events)}