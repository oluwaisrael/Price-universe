import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

# Redis / Celery
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

# Email alerts
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
ALERT_EMAIL_TO = os.getenv("ALERT_EMAIL_TO")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Check your .env file.")
# Price drop alert thresholds
PRICE_DROP_THRESHOLD_PERCENT = 5
PRICE_DROP_THRESHOLD_ABSOLUTE = 2000
