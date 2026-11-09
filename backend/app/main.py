import time
from collections import defaultdict, deque

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import engine

settings = get_settings()
app = FastAPI(title="Argus API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_hits: dict[str, deque] = defaultdict(deque)


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.url.path in ("/health", "/api/v1/health"):
        return await call_next(request)
    key = request.headers.get("authorization") or (request.client.host if request.client else "anon")
    now = time.monotonic()
    window = _hits[key]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= settings.RATE_LIMIT_PER_MINUTE:
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
    window.append(now)
    return await call_next(request)


@app.on_event("startup")
def startup() -> None:
    if settings.DATABASE_URL.startswith("sqlite"):
        from app.db.base import Base
        import app.models  # noqa: F401

        Base.metadata.create_all(engine)


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok", "ai_mode": "dev" if settings.AI_DEV_MODE or not settings.llm_key else "live"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "degraded", "db": "unreachable"})


app.include_router(api_router)