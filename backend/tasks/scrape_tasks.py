from celery import Celery

from config import CELERY_BROKER_URL
from db.database import (
    connect_db,
    disconnect_db,
    insert_products,
)

from scrapers.jumia_scraper import JumiaScraper
from scrapers.jiji_scraper import JijiScraper

import asyncio

celery = Celery(
    "price_universe",
    broker=CELERY_BROKER_URL,
)


@celery.task
def scrape_all_products():
    asyncio.run(run_scraper())


async def run_scraper():
    await connect_db()

    try:
        jumia = JumiaScraper()
        products = jumia.scrape_category("mobile-phones", 100)

        if products:
            await insert_products(products, "Jumia")

        jiji = JijiScraper()
        products = jiji.scrape_category("mobile-phones", 100)

        if products:
            await insert_products(products, "Jiji")

        print("✓ Scheduled scrape finished")

    finally:
        await disconnect_db()