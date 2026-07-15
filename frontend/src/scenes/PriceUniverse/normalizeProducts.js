
import { BASE_URL } from '../../api/client'

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

export function normalizeProducts(rawProducts) {
  if (!Array.isArray(rawProducts)) return []
  return rawProducts
    .map(normalizeProduct)
    .filter((node) => node !== null)
}
