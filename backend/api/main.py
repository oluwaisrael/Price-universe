from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from db.database import (
    connect_db,
    disconnect_db,
    insert_products,
    get_latest_products,
    get_product_history,
    get_latest_products_missing_images,
    update_product_image,
)
from scrapers.jumia_scraper import JumiaScraper
from scrapers.jiji_scraper import JijiScraper

from fastapi.middleware.cors import CORSMiddleware

from datetime import datetime
from urllib.parse import urlparse
from io import BytesIO

import httpx
import sys
import os

app = FastAPI()
ALLOWED_IMAGE_HOSTS = {
    "pictures-nigeria.jijistatic.net",
    "ng.jumia.is",
    "i.jumia.is",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()

@app.get("/")
def root():
    return {"message": "E-commerce Price Intel API", "status": "running"}

@app.get("/api/scrape")
async def scrape_all(category: str = "mobile-phones", limit: int = 5):
    """Scrape from both Jumia and Jiji, save to DB"""

    results = {
        "timestamp": datetime.now().isoformat(),
        "jumia": [],
        "jiji": [],
        "total": 0
    }

    try:
        jumia = JumiaScraper()
        jumia_products = jumia.scrape_category(category, limit)
        results["jumia"] = jumia_products
        await insert_products(jumia_products, "Jumia")
    except Exception as e:
        results["jumia_error"] = str(e)

    try:
        jiji = JijiScraper()
        jiji_products = jiji.scrape_category(category, limit)
        results["jiji"] = jiji_products
        await insert_products(jiji_products, "Jiji")
    except Exception as e:
        results["jiji_error"] = str(e)

    results["total"] = len(results["jumia"]) + len(results["jiji"])
    return results

@app.get("/api/scrape/jumia")
async def scrape_jumia(category: str = "mobile-phones", limit: int = 5):
    """Scrape Jumia only, save to DB"""
    jumia = JumiaScraper()
    products = jumia.scrape_category(category, limit)
    await insert_products(products, "Jumia")
    return {"site": "Jumia", "products": products, "count": len(products)}

@app.get("/api/scrape/jiji")
async def scrape_jiji(category: str = "mobile-phones", limit: int = 5):
    """Scrape Jiji only, save to DB"""
    jiji = JijiScraper()
    products = jiji.scrape_category(category, limit)
    await insert_products(products, "Jiji")
    return {"site": "Jiji", "products": products, "count": len(products)}

@app.get("/api/backfill-images/jiji")
async def backfill_jiji_images(limit: int = 100):
    """Recover missing Jiji images from their individual listing pages."""
    missing_products = await get_latest_products_missing_images("Jiji", limit)
    jiji = JijiScraper()
    updated = 0

    for product in missing_products:
        image_url = jiji.fetch_product_image(product["url"])
        if image_url:
            await update_product_image(product["id"], image_url)
            updated += 1

    return {
        "site": "Jiji",
        "checked": len(missing_products),
        "updated": updated,
        "remaining": len(missing_products) - updated,
    }
@app.get("/api/products")
async def list_products(site: str = None, category: str = None, limit: int = 100):
    """Latest known price for each distinct (url, site) product. Powers the list/table view."""
    products = await get_latest_products(site=site, category=category, limit=limit)
    return {"count": len(products), "products": products}

@app.get("/api/products/history")
async def product_history(url: str, site: str = None):
    """Full price time series for one product, ordered by scraped_at. Feeds the 3D landscape."""
    if not url:
        raise HTTPException(status_code=400, detail="url query param is required")
    history = await get_product_history(url=url, site=site)
    if not history:
        raise HTTPException(status_code=404, detail="No history found for that url/site")
    return {"url": url, "count": len(history), "history": history}
@app.get("/api/image-proxy")
async def image_proxy(url: str):
    """
    Proxies product images from Jumia/Jiji CDNs. Browsers get blocked
    (hotlink/CORS protection) fetching these directly from
    localhost:5173; fetching server-to-server has no such restriction.
    Only allowlisted hosts are proxied — this must stay strict, or
    this endpoint becomes an open relay for arbitrary URLs.
    """
    parsed = urlparse(url)
    if parsed.hostname not in ALLOWED_IMAGE_HOSTS:
        raise HTTPException(status_code=400, detail="Image host not allowed")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10.0, follow_redirects=True)
            response.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch image: {e}")

    content_type = response.headers.get("content-type", "image/jpeg")
    return StreamingResponse(BytesIO(response.content), media_type=content_type)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
