from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import sys
sys.path.insert(0, '/Users/mac/Documents/Ecommerce/backend')

from scrapers.jumia_scraper import JumiaScraper
from scrapers.jiji_scraper import JijiScraper
from db.database import connect_db, disconnect_db, insert_products

app = FastAPI()

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)