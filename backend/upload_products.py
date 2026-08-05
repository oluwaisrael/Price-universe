import os
import asyncio
import httpx
from dotenv import load_dotenv

from scrapers.jumia_scraper import JumiaScraper
from scrapers.jiji_scraper import JijiScraper

load_dotenv()

API_URL = os.getenv("API_URL")
UPLOAD_API_KEY = os.getenv("UPLOAD_API_KEY")


async def upload(products):
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{API_URL}/api/upload-products",
            headers={
                "X-API-Key": UPLOAD_API_KEY
            },
            json={
                "products": products
            },
        )

    print(response.status_code)
    print(response.text)


async def main():
    products = []

    print("Scraping Jumia...")
    jumia = JumiaScraper()
    jumia_products = jumia.scrape_category("mobile-phones", 20)
    products.extend(jumia_products)

    print(f"Found {len(jumia_products)} Jumia products")

    print("Scraping Jiji...")
    jiji = JijiScraper()
    jiji_products = jiji.scrape_category("mobile-phones", 20)
    products.extend(jiji_products)

    print(f"Found {len(jiji_products)} Jiji products")

    if not products:
        print("Nothing to upload.")
        return

    print(f"Uploading {len(products)} products...")
    await upload(products)


if __name__ == "__main__":
    asyncio.run(main())