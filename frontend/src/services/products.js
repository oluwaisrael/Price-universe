import apiClient from '../api/client'

// Wraps GET /api/products 
// Backend responds 
export async function getProducts() {
  const { data } = await apiClient.get('/api/products')
  return data.products ?? []
}

export async function getProductHistory(url) {
  const { data } = await apiClient.get('/api/products/history', {
    params: { url },
  })
  return data
}