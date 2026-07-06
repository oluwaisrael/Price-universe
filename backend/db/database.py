import asyncpg
from config import DATABASE_URL
from config import PRICE_DROP_THRESHOLD_PERCENT, PRICE_DROP_THRESHOLD_ABSOLUTE
from alerts.email_alerts import send_price_drop_alert

pool = None
async def connect_db():
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
async def disconnect_db():
    if pool:
        await pool.close()
async def insert_products(products: list, site: str):
    """
    Insert scraped products into price_history table.
    Skips inserting a row if the price is unchanged from the most
    recent entry for that (url, site) pair -- avoids noise duplicates
    from repeated scrapes with no real price movement.
    """
    if not products:
        return 0
    inserted = 0
    async with pool.acquire() as conn:
        async with conn.transaction():
            for p in products:
                url = p.get("url")
                price = p.get("price")

                last_price = await conn.fetchval(
                    """
                    SELECT price FROM price_history
                    WHERE url = $1 AND site = $2
                    ORDER BY scraped_at DESC
                    LIMIT 1
                    """,
                    url, site,
                )

                if last_price is not None and last_price == price:
                    continue

                if last_price is not None and last_price > price:
                    drop_abs = last_price - price
                    drop_pct = (drop_abs / last_price) * 100
                    if drop_pct >= PRICE_DROP_THRESHOLD_PERCENT or drop_abs >= PRICE_DROP_THRESHOLD_ABSOLUTE:
                        send_price_drop_alert(
                            product_name=p.get("name"),
                            old_price=last_price,
                            new_price=price,
                            url=url,
                            site=site,
                        )

                await conn.execute(
                    """
                    INSERT INTO price_history (product_name, price, url, site, category, seller)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    p.get("name"),
                    price,
                    url,
                    site,
                    p.get("category"),
                    p.get("seller"),
                )
                inserted += 1
    return inserted