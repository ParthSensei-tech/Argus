import hashlib
import hmac
import os
import time
import uuid
from urllib.parse import quote, urlencode

import httpx

from app.core.config import get_settings

settings = get_settings()

MAGIC_SIGNATURES = {
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/webp": [b"RIFF"],
    "application/pdf": [b"%PDF"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [b"PK\x03\x04"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [b"PK\x03\x04"],
}
ZIP_DOC_MIMES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}


class StorageError(Exception):
    pass


def validate_file(data: bytes, mime: str, filename: str) -> None:
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise StorageError(f"File exceeds {settings.MAX_UPLOAD_MB} MB limit")
    if not data:
        raise StorageError("Empty file")
    sigs = MAGIC_SIGNATURES.get(mime)
    if sigs and not any(data.startswith(s) for s in sigs):
        raise StorageError(f"File content does not match declared type {mime}")
    if mime == "image/webp" and data[8:12] != b"WEBP":
        raise StorageError("Invalid WEBP file")
    if mime in ZIP_DOC_MIMES:
        import io
        import zipfile

        try:
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                names = zf.namelist()
                if mime.endswith("wordprocessingml.document") and not any(n.startswith("word/") for n in names):
                    raise StorageError("Invalid DOCX file")
                if mime.endswith("presentationml.presentation") and not any(n.startswith("ppt/") for n in names):
                    raise StorageError("Invalid PPTX file")
        except zipfile.BadZipFile:
            raise StorageError("Invalid office document (bad zip)")
    if mime in ("text/plain", "text/markdown"):
        try:
            data.decode("utf-8")
        except UnicodeDecodeError:
            raise StorageError("Text file is not valid UTF-8")


class LocalStorage:
    def __init__(self, root: str):
        self.root = os.path.abspath(root)
        os.makedirs(self.root, exist_ok=True)

    def _resolve(self, key: str) -> str:
        path = os.path.abspath(os.path.join(self.root, key))
        if not path.startswith(self.root + os.sep) and path != self.root:
            raise StorageError("Invalid storage key")
        return path

    def put(self, org_id: str, data: bytes, filename: str) -> str:
        safe_name = os.path.basename(filename).replace("\\", "_")[:180]
        key = f"{org_id}/{uuid.uuid4().hex}/{safe_name}"
        path = self._resolve(key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        return key

    def get_bytes(self, key: str) -> bytes:
        path = self._resolve(key)
        if not os.path.isfile(path):
            raise StorageError("File not found")
        with open(path, "rb") as f:
            return f.read()

    def signed_url(self, key: str, ttl: int | None = None) -> str:
        expires = int(time.time()) + (ttl or settings.SIGNED_URL_TTL_SECONDS)
        sig = hmac.new(settings.SECRET_KEY.encode(), f"{key}:{expires}".encode(), hashlib.sha256).hexdigest()
        params = urlencode({"key": key, "expires": expires, "sig": sig})
        return f"/api/v1/files/download?{params}"

    def verify(self, key: str, expires: int, sig: str) -> bool:
        if expires < int(time.time()):
            return False
        expected = hmac.new(settings.SECRET_KEY.encode(), f"{key}:{expires}".encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, sig)


class SupabaseStorage:
    """Private Supabase Storage bucket; signed URLs via the storage API."""

    def __init__(self):
        self.base = settings.SUPABASE_URL.rstrip("/")
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_KEY,
        }

    def put(self, org_id: str, data: bytes, filename: str) -> str:
        key = f"{org_id}/{uuid.uuid4().hex}/{os.path.basename(filename)[:180]}"
        r = httpx.post(
            f"{self.base}/storage/v1/object/{self.bucket}/{quote(key)}",
            headers={**self.headers, "Content-Type": "application/octet-stream"},
            content=data,
            timeout=60,
        )
        r.raise_for_status()
        return key

    def get_bytes(self, key: str) -> bytes:
        r = httpx.get(
            f"{self.base}/storage/v1/object/{self.bucket}/{quote(key)}",
            headers=self.headers,
            timeout=60,
        )
        r.raise_for_status()
        return r.content

    def signed_url(self, key: str, ttl: int | None = None) -> str:
        r = httpx.post(
            f"{self.base}/storage/v1/object/sign/{self.bucket}/{quote(key)}",
            headers=self.headers,
            json={"expiresIn": ttl or settings.SIGNED_URL_TTL_SECONDS},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["signedURL"]

    def verify(self, key: str, expires: int, sig: str) -> bool:
        return False  # Supabase URLs are verified by Supabase, not the local download route


def get_storage() -> LocalStorage | SupabaseStorage:
    if settings.STORAGE_BACKEND == "supabase":
        return SupabaseStorage()
    return LocalStorage(settings.STORAGE_LOCAL_DIR)