import hashlib
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_org, require_roles
from app.models.content import UploadedFile
from app.schemas.api import FileOut
from app.schemas.enums import Role
from app.services import audit
from app.services.storage import StorageError, get_storage, validate_file

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_MIMES = {
    "image/png", "image/jpeg", "image/webp", "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/markdown",
}


@router.post("/upload", response_model=FileOut)
async def upload_file(
    file: UploadFile = File(...),
    purpose: str = Form("content"),
    ctx=Depends(require_roles(Role.ADMIN, Role.EDITOR)),
    db: Session = Depends(get_db),
):
    data = await file.read()
    mime = file.content_type or "application/octet-stream"
    if mime not in ALLOWED_MIMES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {mime}")
    if purpose not in ("content", "knowledge", "asset"):
        raise HTTPException(status_code=400, detail="purpose must be content, knowledge or asset")
    try:
        validate_file(data, mime, file.filename or "upload")
    except StorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    storage = get_storage()
    key = storage.put(str(ctx.org_id), data, file.filename or "upload")
    record = UploadedFile(
        org_id=ctx.org_id, filename=file.filename or "upload", mime=mime,
        size_bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
        storage_key=key, purpose=purpose, uploaded_by=ctx.user.id,
    )
    db.add(record)
    db.commit()
    audit.record(db, ctx.org_id, ctx.user.id, "file.uploaded", "uploaded_file", record.id,
                 {"filename": record.filename, "purpose": purpose, "size": len(data)})
    db.commit()
    return record


@router.get("/download")
def download_file(key: str = Query(...), expires: int = Query(...), sig: str = Query(...),
                  db: Session = Depends(get_db)):
    storage = get_storage()
    if not storage.verify(key, expires, sig):
        raise HTTPException(status_code=403, detail="Invalid or expired signed URL")
    try:
        data = storage.get_bytes(key)
    except StorageError:
        raise HTTPException(status_code=404, detail="File not found")
    record = db.query(UploadedFile).filter(UploadedFile.storage_key == key).first()
    filename = record.filename if record else "download"
    mime = record.mime if record else "application/octet-stream"
    return Response(content=data, media_type=mime,
                    headers={"Content-Disposition": f'inline; filename="{filename}"'})


@router.get("/{file_id}/url")
def get_file_url(file_id: uuid.UUID, ctx=Depends(get_org), db: Session = Depends(get_db)):
    record = db.get(UploadedFile, file_id)
    if not record or record.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="File not found")
    return {"url": get_storage().signed_url(record.storage_key)}