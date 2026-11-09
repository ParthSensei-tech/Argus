import threading
import uuid

from app.core.config import get_settings

settings = get_settings()


def _run_in_thread(fn, entity_id: uuid.UUID) -> None:
    def target():
        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            fn(db, entity_id)
        finally:
            db.close()

    threading.Thread(target=target, daemon=True).start()


def dispatch_review(review_id: uuid.UUID) -> str:
    if settings.CELERY_TASK_ALWAYS_EAGER:
        from app.agents.orchestrator import execute_review

        _run_in_thread(execute_review, review_id)
        return "inline-thread (dev)"
    from app.worker.tasks import run_review_task

    run_review_task.delay(str(review_id))
    return "celery"


def dispatch_ingest(source_id: uuid.UUID) -> str:
    if settings.CELERY_TASK_ALWAYS_EAGER:
        from app.services.ingest import ingest_source

        _run_in_thread(ingest_source, source_id)
        return "inline-thread (dev)"
    from app.worker.tasks import ingest_source_task

    ingest_source_task.delay(str(source_id))
    return "celery"