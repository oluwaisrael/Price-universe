import logging
import resend
from config import RESEND_API_KEY, ALERT_EMAIL_TO

resend.api_key = RESEND_API_KEY
logger = logging.getLogger(__name__)


def send_price_drop_alert(product_name: str, old_price: float, new_price: float, url: str, site: str):
    """Send an email alert when a tracked product's price drops past the configured threshold."""
    if not RESEND_API_KEY or not ALERT_EMAIL_TO:
        logger.warning("Email alert skipped: RESEND_API_KEY or ALERT_EMAIL_TO not configured.")
        return

    drop_amount = old_price - new_price
    drop_percent = (drop_amount / old_price) * 100 if old_price else 0

    try:
        resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": ALERT_EMAIL_TO,
            "subject": f"Price Drop: {product_name} (-{drop_percent:.1f}%)",
            "html": (
                f"<h2>{product_name}</h2>"
                f"<p>{site}: ₦{old_price:,.2f} → ₦{new_price:,.2f} "
                f"(-{drop_percent:.1f}%, -₦{drop_amount:,.2f})</p>"
                f"<p><a href=\"{url}\">View listing</a></p>"
            ),
        })
        logger.info(f"Price drop alert sent for {product_name}")
    except Exception as e:
        logger.error(f"Failed to send price drop alert: {e}")
