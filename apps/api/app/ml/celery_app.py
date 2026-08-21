from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "stresslens_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_routes={"app.ml.tasks.*": {"queue": "ml"}},
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_always_eager=True,
    task_eager_propagates=True,
    beat_schedule={
        # run weekly_clustering every Sunday at midnight
        "weekly-clustering": {
            "task": "weekly_clustering",
            "schedule": crontab(hour=0, minute=0, day_of_week="sunday"),
        }
    },
)
