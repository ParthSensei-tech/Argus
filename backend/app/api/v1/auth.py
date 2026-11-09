import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import OrgContext, get_current_user, get_db, get_org
from app.core.security import create_access_token, hash_password, verify_password
from app.models.identity import Organisation, OrganisationMember, User
from app.schemas.auth import (
    CreateOrgIn,
    LoginIn,
    MeOut,
    MembershipOut,
    OrgOut,
    RegisterIn,
    TokenOut,
    UserOut,
)
from app.schemas.enums import Role

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    db.commit()
    return TokenOut(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenOut(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(OrganisationMember, Organisation)
        .join(Organisation, Organisation.id == OrganisationMember.org_id)
        .filter(OrganisationMember.user_id == user.id)
        .all()
    )
    return MeOut(
        user=UserOut(id=user.id, email=user.email, full_name=user.full_name),
        memberships=[MembershipOut(org_id=o.id, org_name=o.name, role=m.role) for m, o in rows],
    )


@router.post("/orgs", response_model=OrgOut, status_code=201)
def create_org(
    body: CreateOrgIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slug = re.sub(r"[^a-z0-9]+", "-", body.name.lower()).strip("-")[:80] or "org"
    if db.query(Organisation).filter(Organisation.slug == slug).first():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    org = Organisation(name=body.name, slug=slug)
    db.add(org)
    db.flush()
    db.add(OrganisationMember(org_id=org.id, user_id=user.id, role=Role.ADMIN.value))
    db.commit()
    return OrgOut(id=org.id, name=org.name, slug=org.slug)