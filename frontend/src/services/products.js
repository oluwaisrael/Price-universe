import apiClient from '../api/client'

// Wraps GET /api/products 
// Backend responds 
export async function getProducts() {
  const { data } = await apiClient.get('/api/products')
  return data.products ?? []
}

// Wraps GET /api/products/history?url=... — returns price history for
// a single product identified by  URL.
export async function getProductHistory(url) {
  const { data } = await apiClient.get('/api/products/history', {
    params: { url },
  })
  return data
}