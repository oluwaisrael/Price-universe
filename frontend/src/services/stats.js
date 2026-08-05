import apiClient from '../api/client'

/** Live hero stats from GET /api/stats */
export async function getStats() {
  const { data } = await apiClient.get('/api/stats')

  return {
    productsTracked: data.products_tracked ?? 0,
    priceDropsToday: data.price_drops_today ?? 0,
    lastUpdated: data.last_updated ?? null,
  }
}