from celery import Celery
from celery.schedules import crontab
import os
from dotenv import load_dotenv
load_dotenv()

celery_app = Celery(
    "price_engine",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/1"),
    include=["tasks.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    timezone="Africa/Lagos",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "scrape-jumia-every-6h": {
        "task": "tasks.tasks.scrape_jumia_task",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "scrape-jiji-every-6h": {
        "task": "tasks.tasks.scrape_jiji_task",
        "schedule": crontab(minute=0, hour="*/6"),
    },
}