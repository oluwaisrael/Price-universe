/**
 * Product Normalizer — Phase 0 of PriceUniverse.
 *
 * The scene, layout engine, and renderer should never import from
 * services/products.js or know the shape of the FastAPI response
 * (product_name, image_url, etc). Everything downstream consumes
 * UniverseNode objects instead.
 *
 * When the ML phase (4C) adds prediction/confidence/volatility to the
 * API response, extend normalizeProducts() to map those fields onto
 * UniverseNode — the layout engine and renderer stay untouched.
 *
 * UniverseNode shape:
 * {
 *   id: string            — stable unique key (falls back to url if no id)
 *   name: string
 *   image: string | null   — routed through /api/image-proxy, see below
 *   price: number
 *   site: string          — "Jumia" | "Jiji" | ...
 *   category: string | null
 *   url: string | null
 *   scrapedAt: string | null   — ISO timestamp, for future history/recency use
 *   color: string          — hex, derived from site (galaxy tint)
 *   importance: number     — 0–1, reserved for future weighting (e.g. by
 *                             price-drop frequency); uniform for now since
 *                             size-by-price was explicitly rejected
 * }
 *
 * Position is NOT assigned here — that's the Layout Engine's job
 * (Phase 2), which takes UniverseNode[] and returns positioned nodes.
 * Keeping position out of the normalizer means layouts are swappable
 * without touching this file.
 *
 * Image URLs from Jumia/Jiji CDNs block direct browser fetches
 * (hotlink/CORS protection — confirmed via ERR_FAILED in testing), so
 * every image is rewritten to go through the backend's
 * /api/image-proxy endpoint, which fetches server-to-server instead.
 */
import { BASE_URL } from '../../api/client'

// Site → color mapping. Extend as more sites are added.
const SITE_COLORS = {
  Jumia: '#ff9900',
  Jiji: '#22e5e5',
}

const DEFAULT_COLOR = '#888888'

function siteColor(site) {
  return SITE_COLORS[site] ?? DEFAULT_COLOR
}

function proxiedImageUrl(imageUrl) {
  if (!imageUrl) return null
  return `${BASE_URL}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
}

/**
 * Converts one raw API product object into a UniverseNode.
 * Returns null if the product is missing data essential to render it
 * (no price, or no stable identifier) — callers should filter these out.
 */
export function normalizeProduct(raw) {
  if (!raw) return null

  const price = typeof raw.price === 'number' ? raw.price : null
  const id = raw.id != null ? String(raw.id) : raw.url

  if (price === null || !id) return null

  return {
    id,
    name: raw.product_name ?? 'Unnamed product',
    image: proxiedImageUrl(raw.image_url),
    price,
    site: raw.site ?? 'Unknown',
    category: raw.category ?? null,
    url: raw.url ?? null,
    scrapedAt: raw.scraped_at ?? null,
    color: siteColor(raw.site),
    importance: 0.5,
  }
}

/**
 * Converts a raw API product array into UniverseNode[], dropping any
 * entries that fail to normalize (missing price/id) rather than
 * throwing — a malformed row shouldn't crash the whole universe.
 */
export function normalizeProducts(rawProducts) {
  if (!Array.isArray(rawProducts)) return []
  return rawProducts
    .map(normalizeProduct)
    .filter((node) => node !== null)
}
