import uuid

from app.db.session import SessionLocal
from app.worker.celery_app import celery_app


@celery_app.task(name="argus.run_review", bind=True, max_retries=1)
def run_review_task(self, review_id: str):
    from app.agents.orchestrator import execute_review

    db = SessionLocal()
    try:
        execute_review(db, uuid.UUID(review_id))
    finally:
        db.close()


@celery_app.task(name="argus.ingest_source", bind=True, max_retries=1)
def ingest_source_task(self, source_id: str):
    from app.services.ingest import ingest_source

    db = SessionLocal()
    try:
        ingest_source(db, uuid.UUID(source_id))
    finally:
        db.close()