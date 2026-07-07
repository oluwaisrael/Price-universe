# backend/tasks/tasks.py
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# pylint: disable=import-error
from tasks.celery_app import celery_app
from scrapers.jumia_scraper import JumiaScraper
from scrapers.jiji_scraper import JijiScraper
from db.database import connect_db, disconnect_db, insert_products


async def _run_jumia(category: str, item_count: int):
    scraper = JumiaScraper()
    products = scraper.scrape_category(category, item_count)
    if not products:
        return 0
    await connect_db()
    try:
        await insert_products(products, site="Jumia")
    finally:
        await disconnect_db()
    return len(products)


async def _run_jiji(category: str, item_count: int):
    scraper = JijiScraper()
    products = scraper.scrape_category(category, item_count)
    if not products:
        return 0
    await connect_db()
    try:
        await insert_products(products, site="Jiji")
    finally:
        await disconnect_db()
    return len(products)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60, rate_limit="10/m")
def scrape_jumia_task(self, category: str = "mobile-phones", item_count: int = 20):
    try:
        return asyncio.run(_run_jumia(category, item_count))
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60, rate_limit="10/m")
def scrape_jiji_task(self, category: str = "mobile-phones", item_count: int = 20):
    try:
        return asyncio.run(_run_jiji(category, item_count))
    except Exception as exc:
        raise self.retry(exc=exc)
