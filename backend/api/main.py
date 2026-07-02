from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import sys
sys.path.insert(0, '/Users/mac/Documents/Ecommerce/backend')

from scrapers.jumia_scraper import JumiaScraper
from scrapers.jiji_scraper import JijiScraper

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "E-commerce Price Intel API", "status": "running"}

@app.get("/api/scrape")
def scrape_all(category: str = "mobile-phones", limit: int = 5):
    """Scrape from both Jumia and Jiji"""
    
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
    except Exception as e:
        results["jumia_error"] = str(e)
    
    try:
        jiji = JijiScraper()
        jiji_products = jiji.scrape_category(category, limit)
        results["jiji"] = jiji_products
    except Exception as e:
        results["jiji_error"] = str(e)
    
    results["total"] = len(results["jumia"]) + len(results["jiji"])
    return results

@app.get("/api/scrape/jumia")
def scrape_jumia(category: str = "mobile-phones", limit: int = 5):
    """Scrape Jumia only"""
    jumia = JumiaScraper()
    products = jumia.scrape_category(category, limit)
    return {"site": "Jumia", "products": products, "count": len(products)}

@app.get("/api/scrape/jiji")
def scrape_jiji(category: str = "mobile-phones", limit: int = 5):
    """Scrape Jiji only"""
    jiji = JijiScraper()
    products = jiji.scrape_category(category, limit)
    return {"site": "Jiji", "products": products, "count": len(products)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)