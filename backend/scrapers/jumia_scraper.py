import cloudscraper
import requests
import time
import random
from bs4 import BeautifulSoup
from typing import List, Dict
from datetime import datetime
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JumiaScraper:
    def __init__(self):
        self.base_url = "https://www.jumia.com.ng"
        self.scraper = cloudscraper.create_scraper()

        retries = Retry(
            total=3,
            connect=3,
            read=2,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.scraper.mount("https://", adapter)
        self.scraper.mount("http://", adapter)

    def _extract_name(self, product) -> str:
        """Try multiple selectors in order; log which one worked."""
        candidates = [
            ("h3.name", lambda p: p.find("h3", class_="name")),
            ("a[title]", lambda p: p.find("a", class_="core")),
            ("img[alt]", lambda p: p.find("img")),
        ]
        for label, finder in candidates:
            el = finder(product)
            if el is None:
                continue
            if el.name == "h3":
                text = el.text.strip()
            else:
                text = el.get("title") or el.get("alt")
                text = text.strip() if text else None
            if text:
                if label != "h3.name":
                    logger.info(f"Name extracted via fallback: {label}")
                return text
        return None
        
    def scrape_category(self, category: str = "mobile-phones", item_count: int = 5) -> List[Dict]:
        """Scrape products from Jumia"""
        # just so it Uses the working URL
        url = f"{self.base_url}/{category}/"
        
        try:
            print(f" Fetching: {url}")
            time.sleep(random.uniform(1.5, 4.0))
            try:
                response = self.scraper.get(url, timeout=15)
            except requests.exceptions.ConnectTimeout:
                logger.error(f"Jumia unresponsive (connect timeout) for {url}")
                return []
            except requests.exceptions.RequestException as e:
                logger.error(f"Jumia request failed: {e}")
                return []
            print(f" Status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"Failed: {response.status_code}")
                return []
            
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Finding the product containers (articles with class -- prd)
            products_html = soup.find_all("article", class_="prd", limit=item_count)
            
            print(f"Found {len(products_html)} products")
            
            if not products_html:
                logger.warning(f"No products found. Debug: printing first 2000 chars of HTML")
                print(response.text[:2000])
                return []
            
            products = []
            for product in products_html:
                try:
                    # Extract from link's data attributes (verified working)
                    link_tag = product.find("a", class_="core")
                    if not link_tag:
                        continue
                    
                    name = self._extract_name(product)
                    if not name:
                        logger.warning("No name found via any selector - skipping product")
                        continue

                    product_url = link_tag.get("href", "")
                    if product_url and not product_url.startswith("http"):
                        product_url = f"{self.base_url}{product_url}"
                    
                    # Price extraction (working)
                    price_tag = product.find(class_="prc")
                    price_text = price_tag.text.strip() if price_tag else "0"
                    price = price_text.replace("₦", "").replace(",", "").strip()
                    
                    # Seller info (optional, fallback to Jumia)
                    seller_tag = product.find("span", class_="seller")
                    seller = seller_tag.text.strip() if seller_tag else "Jumia"
                    
                    product_data = {
                        "name": name,
                        "price": float(price) if price else 0.0,
                        "url": product_url,
                        "seller": seller,
                        "site": "Jumia",
                        "category": category,
                        "scraped_at": datetime.now().isoformat()
                    }
                    
                    products.append(product_data)
                    logger.info(f"✓ {name} - ₦{price}")
                    
                except Exception as e:
                    logger.warning(f"Error parsing product: {e}")
                    continue
            
            return products
                    
        except Exception as e:
            logger.error(f"Error: {e}")
            return []

def main():
    scraper = JumiaScraper()
    products = scraper.scrape_category("mobile-phones", item_count=5)
    
    print(f"\n Scraped {len(products)} products:\n")
    for p in products:
        print(f"  • {p['name']}")
        print(f"    Price: ₦{p['price']}")
        print(f"    URL: {p['url']}\n")

if __name__ == "__main__":
    main()