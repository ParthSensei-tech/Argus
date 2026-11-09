import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.models.identity import OrganisationMember, User
from app.schemas.api import MemberIn, MemberOut
from app.schemas.enums import Role
from app.services import audit

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=list[MemberOut])
def list_members(ctx=Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)):
    return db.query(OrganisationMember).filter(OrganisationMember.org_id == ctx.org_id).all()


@router.post("", response_model=MemberOut)
def add_member(payload: MemberIn, ctx=Depends(require_roles(Role.ADMIN)), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user with that email; they must register first")
    existing = (
        db.query(OrganisationMember)
        .filter(OrganisationMember.org_id == ctx.org_id, OrganisationMember.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member")
    member = OrganisationMember(org_id=ctx.org_id, user_id=user.id, role=payload.role.value)
    db.add(member)
    audit.record(db, ctx.org_id, ctx.user.id, "org.member_added", "organisation_member", member.id,
                 {"email": user.email, "role": payload.role.value})
    db.commit()
    return member


@router.patch("/{member_id}", response_model=MemberOut)
def update_member(member_id: uuid.UUID, payload: MemberIn, ctx=Depends(require_roles(Role.ADMIN)),
                  db: Session = Depends(get_db)):
    member = db.get(OrganisationMember, member_id)
    if not member or member.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.user_id == ctx.user.id and payload.role != Role.ADMIN:
        raise HTTPException(status_code=400, detail="You cannot demote yourself")
    member.role = payload.role.value
    audit.record(db, ctx.org_id, ctx.user.id, "org.member_role_changed", "organisation_member", member.id,
                 {"role": payload.role.value})
    db.commit()
    return member


@router.delete("/{member_id}")
def remove_member(member_id: uuid.UUID, ctx=Depends(require_roles(Role.ADMIN)),
                  db: Session = Depends(get_db)):
    member = db.get(OrganisationMember, member_id)
    if not member or member.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.user_id == ctx.user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself")
    db.delete(member)
    audit.record(db, ctx.org_id, ctx.user.id, "org.member_removed", "organisation_member", member_id)
    db.commit()
    return {"removed": True}