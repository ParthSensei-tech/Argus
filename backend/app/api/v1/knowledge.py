import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_org, require_roles
from app.models.content import UploadedFile
from app.models.knowledge import BrandProfile, KnowledgeItem, KnowledgeSource, KnowledgeVersion
from app.schemas.api import (
    BrandProfileIn,
    BrandProfileOut,
    ItemCreate,
    ItemOut,
    SourceCreate,
    SourceOut,
    VersionCreate,
    VersionOut,
)
from app.schemas.enums import Role
from app.services import audit, knowledge
from app.services.jobs import dispatch_ingest

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


def _get_item(db: Session, org_id: uuid.UUID, item_id: uuid.UUID) -> KnowledgeItem:
    item = db.get(KnowledgeItem, item_id)
    if not item or item.org_id != org_id:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    return item


@router.get("/sources", response_model=list[SourceOut])
def list_sources(ctx=Depends(get_org), db: Session = Depends(get_db)):
    return (
        db.query(KnowledgeSource)
        .filter(KnowledgeSource.org_id == ctx.org_id)
        .order_by(KnowledgeSource.created_at.desc())
        .all()
    )


@router.post("/sources", response_model=SourceOut)
def create_source(payload: SourceCreate, ctx=Depends(require_roles(Role.ADMIN, Role.EDITOR)),
                  db: Session = Depends(get_db)):
    if payload.file_id:
        f = db.get(UploadedFile, payload.file_id)
        if not f or f.org_id != ctx.org_id:
            raise HTTPException(status_code=404, detail="File not found")
    source = KnowledgeSource(
        org_id=ctx.org_id, title=payload.title, kind=payload.kind,
        file_id=payload.file_id, submitted_by=ctx.user.id,
    )
    db.add(source)
    db.commit()
    audit.record(db, ctx.org_id, ctx.user.id, "knowledge.source_created", "knowledge_source", source.id,
                 {"title": source.title})
    db.commit()
    if source.file_id:
        dispatch_ingest(source.id)
    return source


@router.get("/sources/{source_id}")
def get_source(source_id: uuid.UUID, ctx=Depends(get_org), db: Session = Depends(get_db)):
    source = db.get(KnowledgeSource, source_id)
    if not source or source.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Source not found")
    items = db.query(KnowledgeItem).filter(KnowledgeItem.source_id == source.id).all()
    return {"source": SourceOut.model_validate(source), "items": [ItemOut.model_validate(i) for i in items]}


@router.post("/sources/{source_id}/approve", response_model=SourceOut)
def approve_source(source_id: uuid.UUID, ctx=Depends(require_roles(Role.ADMIN, Role.REVIEWER)),
                   db: Session = Depends(get_db)):
    source = db.get(KnowledgeSource, source_id)
    if not source or source.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Source not found")
    source.status = "APPROVED"
    source.approved_by = ctx.user.id
    from app.models.identity import utcnow
    source.approved_at = utcnow()
    audit.record(db, ctx.org_id, ctx.user.id, "knowledge.source_approved", "knowledge_source", source.id)
    db.commit()
    return source


@router.get("/items", response_model=list[ItemOut])
def list_items(status: str | None = Query(None), type: str | None = Query(None),
               ctx=Depends(get_org), db: Session = Depends(get_db)):
    q = db.query(KnowledgeItem).filter(KnowledgeItem.org_id == ctx.org_id)
    if status:
        q = q.filter(KnowledgeItem.status == status)
    if type:
        q = q.filter(KnowledgeItem.type == type)
    return q.order_by(KnowledgeItem.updated_at.desc()).all()


@router.post("/items", response_model=ItemOut)
def create_item(payload: ItemCreate, ctx=Depends(require_roles(Role.ADMIN, Role.EDITOR)),
                db: Session = Depends(get_db)):
    item = knowledge.create_item(
        db, ctx.org_id, ctx.user.id, payload.type.value, payload.title,
        payload.body, payload.structured, payload.source_id,
    )
    db.commit()
    return item


@router.get("/items/{item_id}")
def get_item(item_id: uuid.UUID, ctx=Depends(get_org), db: Session = Depends(get_db)):
    item = _get_item(db, ctx.org_id, item_id)
    versions = (
        db.query(KnowledgeVersion)
        .filter(KnowledgeVersion.item_id == item.id)
        .order_by(KnowledgeVersion.version.desc())
        .all()
    )
    return {"item": ItemOut.model_validate(item), "versions": [VersionOut.model_validate(v) for v in versions]}


@router.post("/items/{item_id}/approve", response_model=ItemOut)
def approve_item(item_id: uuid.UUID, ctx=Depends(require_roles(Role.ADMIN, Role.REVIEWER)),
                 db: Session = Depends(get_db)):
    item = _get_item(db, ctx.org_id, item_id)
    if item.status == "APPROVED":
        raise HTTPException(status_code=409, detail="Item already approved")
    knowledge.approve_item(db, ctx.org_id, ctx.user.id, item)
    db.commit()
    return item


@router.post("/items/{item_id}/reject", response_model=ItemOut)
def reject_item(item_id: uuid.UUID, ctx=Depends(require_roles(Role.ADMIN, Role.REVIEWER)),
                db: Session = Depends(get_db)):
    item = _get_item(db, ctx.org_id, item_id)
    knowledge.reject_item(db, ctx.org_id, ctx.user.id, item)
    db.commit()
    return item


@router.post("/items/{item_id}/versions")
def create_version(item_id: uuid.UUID, payload: VersionCreate,
                   ctx=Depends(require_roles(Role.ADMIN, Role.EDITOR)), db: Session = Depends(get_db)):
    item = _get_item(db, ctx.org_id, item_id)
    if item.status != "APPROVED":
        raise HTTPException(status_code=409, detail="Only approved items can be versioned; approve or reject first")
    version, impact = knowledge.create_version(
        db, ctx.org_id, ctx.user.id, item, payload.body, payload.structured, payload.change_note,
    )
    db.commit()
    return {
        "version": VersionOut.model_validate(version),
        "impact_event_id": str(impact.id) if impact else None,
        "affected_count": impact.affected_count if impact else 0,
    }


@router.get("/items/{item_id}/versions", response_model=list[VersionOut])
def list_versions(item_id: uuid.UUID, ctx=Depends(get_org), db: Session = Depends(get_db)):
    _get_item(db, ctx.org_id, item_id)
    return (
        db.query(KnowledgeVersion)
        .filter(KnowledgeVersion.item_id == item_id)
        .order_by(KnowledgeVersion.version.desc())
        .all()
    )


@router.get("/brand-profile", response_model=BrandProfileOut | None)
def get_brand_profile(ctx=Depends(get_org), db: Session = Depends(get_db)):
    return db.query(BrandProfile).filter(BrandProfile.org_id == ctx.org_id).first()


@router.put("/brand-profile", response_model=BrandProfileOut)
def put_brand_profile(payload: BrandProfileIn, ctx=Depends(require_roles(Role.ADMIN, Role.EDITOR)),
                      db: Session = Depends(get_db)):
    profile = db.query(BrandProfile).filter(BrandProfile.org_id == ctx.org_id).first()
    if not profile:
        profile = BrandProfile(org_id=ctx.org_id)
        db.add(profile)
    profile.name = payload.name
    profile.description = payload.description
    profile.voice_tone = payload.voice_tone
    profile.colors = payload.colors
    audit.record(db, ctx.org_id, ctx.user.id, "knowledge.brand_profile_updated", "brand_profile", profile.id)
    db.commit()
    return profile