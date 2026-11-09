import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.identity import OrganisationMember, User
from app.schemas.enums import Role

bearer = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_access_token(creds.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Unknown or inactive user")
    return user


@dataclass
class OrgContext:
    org_id: uuid.UUID
    user: User
    role: str


def get_org(
    x_org_id: uuid.UUID = Header(alias="X-Org-Id"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrgContext:
    member = (
        db.query(OrganisationMember)
        .filter(OrganisationMember.org_id == x_org_id, OrganisationMember.user_id == user.id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="No access to this organisation")
    return OrgContext(org_id=x_org_id, user=user, role=member.role)


def require_roles(*roles: Role):
    allowed = {r.value for r in roles}

    def checker(ctx: OrgContext = Depends(get_org)) -> OrgContext:
        if ctx.role not in allowed:
            raise HTTPException(status_code=403, detail=f"Requires role: {', '.join(sorted(allowed))}")
        return ctx

    return checker