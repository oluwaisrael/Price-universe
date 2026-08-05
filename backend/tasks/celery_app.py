from celery import Celery
from celery.schedules import crontab
import os
from dotenv import load_dotenv
load_dotenv()

celery_app = Celery(
    "price_engine",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1"),
    include=["tasks.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    timezone="Africa/Lagos",
    enable_utc=True,
    result_expires=3600,

)

celery_app.conf.beat_schedule = {
    "scrape-every-12-hours": {
        "task": "tasks.tasks.scrape_all_task",
        "schedule": crontab(minute=0, hour="*/12"),
    },
}