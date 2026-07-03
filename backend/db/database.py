import asyncpg
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/ecommerce_price_tracker")

pool = None

async def connect_db():
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)

async def disconnect_db():
    if pool:
        await pool.close()

async def insert_products(products: list, site: str):
    """Insert scraped products into price_history table"""
    if not products:
        return

    async with pool.acquire() as conn:
        await conn.executemany(
            """
            INSERT INTO price_history (product_name, price, url, site, category, seller)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            [
                (
                    p.get("name"),
                    p.get("price"),
                    p.get("url"),
                    site,
                    p.get("category"),
                    p.get("seller"),
                )
                for p in products
            ],
        )