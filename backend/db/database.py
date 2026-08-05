import asyncpg
from config import DATABASE_URL
from config import PRICE_DROP_THRESHOLD_PERCENT, PRICE_DROP_THRESHOLD_ABSOLUTE
from alerts.email_alerts import send_price_drop_alert

pool = None
async def connect_db():
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)

    await ensure_price_history_table()
    await ensure_tracked_table()

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

                last_product = await conn.fetchrow(
                    """
                    SELECT id, price, image_url FROM price_history
                    WHERE url = $1 AND site = $2
                    ORDER BY scraped_at DESC
                    LIMIT 1
                    """,
                    url, site,
                )

                # A listing can keep the same price while its image is
                # discovered on a later scrape. Update the missing image in
                # place without creating a duplicate history point.
                if last_product is not None and last_product["price"] == price:
                    if not last_product["image_url"] and p.get("image"):
                        await conn.execute(
                            "UPDATE price_history SET image_url = $1 WHERE id = $2",
                            p["image"], last_product["id"],
                        )
                    continue

                if last_product is not None and last_product["price"] > price:
                    drop_abs = float(last_product["price"]) - float(price)
                    drop_pct = (drop_abs / float(last_product["price"])) * 100
                    if drop_pct >= PRICE_DROP_THRESHOLD_PERCENT or drop_abs >= PRICE_DROP_THRESHOLD_ABSOLUTE:
                        send_price_drop_alert(
                            product_name=p.get("name"),
                            old_price=last_product["price"],
                            new_price=price,
                            url=url,
                            site=site,
                        )

                await conn.execute(
                    """
                    INSERT INTO price_history (product_name, price, url, site, category, seller, image_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    p.get("name"),
                    price,
                    url,
                    site,
                    p.get("category"),
                    p.get("seller"),
                    p.get("image"),
                )
                inserted += 1
    return inserted
async def get_latest_products(site: str = None, category: str = None, limit: int = 100):
    """
    Most recent price_history row per distinct (url, site) pair.
    Used by GET /api/products for the list/table view.
    """
    filters = []
    args = []

    if site:
        args.append(site)
        filters.append(f"site = ${len(args)}")

    if category:
        args.append(category)
        filters.append(f"category = ${len(args)}")

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    args.append(limit)

    query = f"""
        SELECT DISTINCT ON (url, site)
            id, product_name, price, url, site, category, seller, scraped_at, image_url
        FROM price_history
        {where_clause}
        ORDER BY url, site, scraped_at DESC
        LIMIT ${len(args)}
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *args)

    return [dict(r) for r in rows]

async def get_latest_products_missing_images(site: str, limit: int = 100):
    """Return the latest row for listings that still need an image backfill."""
    query = """
        SELECT id, url, site
        FROM (
            SELECT DISTINCT ON (url, site)
                id, url, site, image_url
            FROM price_history
            WHERE site = $1
            ORDER BY url, site, scraped_at DESC
        ) AS latest
        WHERE image_url IS NULL OR BTRIM(image_url) = ''
        LIMIT $2
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, site, limit)
    return [dict(row) for row in rows]

async def update_product_image(product_id: int, image_url: str):
    """Attach a recovered image URL to an existing latest product row."""
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE price_history SET image_url = $1 WHERE id = $2",
            image_url, product_id,
        )


async def get_product_history(url: str, site: str = None):
    """
    Full price time series for one product, oldest to newest.
    Used by GET /api/products/history to feed the 3D price/time landscape.
    """
    if site:
        query = """
            SELECT id, product_name, price, url, site, category, seller, scraped_at, image_url
            FROM price_history
            WHERE url = $1 AND site = $2
            ORDER BY scraped_at ASC
        """
        args = (url, site)
    else:
        query = """
            SELECT id, product_name, price, url, site, category, seller, scraped_at, image_url
            FROM price_history
            WHERE url = $1
            ORDER BY scraped_at ASC
        """
        args = (url,)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *args)

    return [dict(r) for r in rows]

async def get_stats():
    """
    Live dashboard stats for the hero section.
    - products_tracked: distinct (url, site) with a latest row
    - price_drops_today: products whose latest scrape today is lower than previous
    - last_updated: latest scrape timestamp
    """
    async with pool.acquire() as conn:
        products_tracked = await conn.fetchval(
            """
            SELECT COUNT(*) FROM (
                SELECT DISTINCT url, site FROM price_history
            ) AS t
            """
        )

        price_drops_today = await conn.fetchval(
            """
            WITH ordered AS (
                SELECT
                    url,
                    site,
                    price,
                    scraped_at,
                    LAG(price) OVER (
                        PARTITION BY url, site
                        ORDER BY scraped_at
                    ) AS prev_price
                FROM price_history
            )
            SELECT COUNT(*) FROM ordered
            WHERE prev_price IS NOT NULL
              AND price < prev_price
              AND scraped_at >= date_trunc('day', NOW() AT TIME ZONE 'Africa/Lagos')
            """
        )

        latest_update = await conn.fetchval(
            """
            SELECT MAX(scraped_at)
            FROM price_history
            """
        )

    return {
        "products_tracked": int(products_tracked or 0),
        "price_drops_today": int(price_drops_today or 0),
        "last_updated": latest_update.isoformat() if latest_update else None,
    }

async def ensure_price_history_table():
    """Create price_history table if missing."""
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS price_history (
                id SERIAL PRIMARY KEY,
                product_name TEXT,
                price DOUBLE PRECISION,
                url TEXT NOT NULL,
                site TEXT,
                category TEXT,
                seller TEXT,
                image_url TEXT,
                scraped_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

async def ensure_tracked_table():
    """Create tracked_products table if missing."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tracked_products (
                id SERIAL PRIMARY KEY,
                url TEXT NOT NULL,
                site TEXT,
                email TEXT,
                product_name TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE (url)
            )
            """
        )


async def add_tracked_product(url: str, site: str = None, email: str = None, product_name: str = None):
    await ensure_tracked_table()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO tracked_products (url, site, email, product_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (url) DO UPDATE SET
                email = COALESCE(EXCLUDED.email, tracked_products.email),
                site = COALESCE(EXCLUDED.site, tracked_products.site),
                product_name = COALESCE(EXCLUDED.product_name, tracked_products.product_name)
            RETURNING id, url, site, email, product_name, created_at
            """,
            url, site, email, product_name,
        )
    return dict(row) if row else None


async def list_tracked_products(limit: int = 100):
    await ensure_tracked_table()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, url, site, email, product_name, created_at
            FROM tracked_products
            ORDER BY created_at DESC
            LIMIT $1
            """,
            limit,
        )
    return [dict(r) for r in rows]
