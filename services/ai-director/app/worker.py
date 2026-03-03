import os
from celery import Celery

from app.config import settings

celery_app = Celery(
    "ai_director",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1"),
    include=["app.tasks.generation", "app.tasks.pool_monitor", "app.tasks.pool_generation"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    beat_schedule={
        "monitor-pool-levels": {
            "task": "monitor_pool_levels",
            "schedule": float(settings.pool_monitor_interval_seconds),
            "options": {"queue": "default"},
        },
    },
)
