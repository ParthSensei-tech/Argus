import hashlib
import json
import threading
import uuid

from sqlalchemy import event, text
from sqlalchemy.orm import Session

from app.models.audit import AuditEvent

_chain_lock = threading.RLock()
_held: dict[int, int] = {}


def _release(db: Session) -> None:
    count = _held.pop(id(db), 0)
    for _ in range(count):
        _chain_lock.release()


def record(
    db: Session,
    org_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None,
    payload: dict | None = None,
) -> AuditEvent:
    # Serialize chain appends per org until the caller's transaction ends,
    # otherwise concurrent sessions fork the chain from the same prev_hash.
    if db.get_bind().dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:k))"), {"k": f"audit:{org_id}"})
    else:
        _chain_lock.acquire()
        sid = id(db)
        if _held.get(sid, 0) == 0:
            event.listen(db, "after_transaction_end", lambda s, t: _release(s), once=True)
        _held[sid] = _held.get(sid, 0) + 1
    last = (
        db.query(AuditEvent)
        .filter(AuditEvent.org_id == org_id)
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    prev_hash = last.hash if last else ""
    body = {
        "org_id": str(org_id),
        "actor_id": str(actor_id) if actor_id else None,
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id) if entity_id else None,
        "payload": payload or {},
    }
    digest = hashlib.sha256((prev_hash + json.dumps(body, sort_keys=True, default=str)).encode()).hexdigest()
    event_ = AuditEvent(
        org_id=org_id,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload or {},
        prev_hash=prev_hash,
        hash=digest,
    )
    db.add(event_)
    return event_