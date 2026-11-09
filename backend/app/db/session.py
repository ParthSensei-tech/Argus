import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()
url = settings.DATABASE_URL

if url.startswith("sqlite"):
    raw_path = url.replace("sqlite:///", "")
    if not os.path.isabs(raw_path):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        clean_rel = raw_path.lstrip("./\\")
        db_path = os.path.join(backend_dir, clean_rel)
    else:
        db_path = raw_path
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
    url = f"sqlite:///{db_path.replace(os.sep, '/')}"

engine = create_engine(
    url,
    connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)