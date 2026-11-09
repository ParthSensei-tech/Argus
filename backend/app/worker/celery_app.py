from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery("argus", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
    task_eager_propagates=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_time_limit=900,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
celery_app.autodiscover_tasks(["app.worker"])