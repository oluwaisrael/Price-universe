import cloudscraper
from bs4 import BeautifulSoup
from typing import List, Dict
from datetime import datetime
import logging
import time
import random


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JijiScraper:
    def __init__(self):
        self.base_url = "https://jiji.ng"
        self.scraper = cloudscraper.create_scraper()

    def _extract_name(self, item) -> str:
        """
        Extract product name with fallback chain.
        Tier 1: img[alt] (primary - currently working)
        Tier 2: a[title] (link title attribute, if present)
        Tier 3: any element with 'title' in its class (generic text fallback)
        """

        #img alt text (primary)
        img = item.select_one("img")
        if img and img.get("alt"):
            return img.get("alt").strip()
    
        #second link title attribute
        link_with_title = item.select_one("a[title]")
        if link_with_title and link_with_title.get("title"):
            logger.warning("Name extracted via fallback: a[title]")
            return link_with_title.get("title").strip()
    
        #3: any element whose class contains 'title'
        title_el = item.select_one("[class*='title']")
        if title_el and title_el.get_text(strip=True):
            logger.warning("Name extracted via fallback: [class*='title']")
            return title_el.get_text(strip=True)
    
        return None    
        
    
    def scrape_category(self, category: str = "mobile-phones", item_count: int = 5) -> List[Dict]:
        """Scrape products from Jiji using cloudscraper + BeautifulSoup"""
        url = f"{self.base_url}/{category}"
        
        try:
            print(f"Fetching: {url}")
            time.sleep(random.uniform(1.5, 4.0))
            response = self.scraper.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Find product items
            product_items = soup.select("div.b-adverts-gallery-listing__item")[:item_count]
            print(f"Found {len(product_items)} products")
            
            if not product_items:
                logger.warning("No products found")
                return []
            
            products = []
            for item in product_items:
                try:
                    name = self._extract_name(item)

                    if not name:
                       logger.warning("Skipping product without name")
                       continue

                    # Extract price
                    price_div = item.select_one("div[class*='price']")
                    price_text = price_div.get_text(strip=True) if price_div else "0"
                    
                    
                    price_str = price_text.replace("₦", "").replace(",", "").strip().split()[0]
                    price = float(price_str) if price_str else 0.0
                    
                    # Extract URL
                    link = item.select_one("a.b-list-advert-base")
                    product_url = link.get("href") if link else ""
                    if product_url and not product_url.startswith("http"):
                        product_url = f"{self.base_url}{product_url}"
                    
                    product_data = {
                        "name": name,
                        "price": price,
                        "url": product_url,
                        "site": "Jiji",
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
    scraper = JijiScraper()
    products = scraper.scrape_category("mobile-phones", item_count=5)
    
    print(f"\n Scraped {len(products)} products:\n")
    for p in products:
        print(f"  • {p['name']}")
        print(f"    Price: ₦{p['price']}")
        print(f"    URL: {p['url']}\n")
        

if __name__ == "__main__":
    main()