import apiClient from '../api/client'

export async function trackProduct({ url, email }) {
  const { data } = await apiClient.post('/api/track', { url, email: email || undefined })
  return data
}

export async function getTracked() {
  const { data } = await apiClient.get('/api/tracked')
  return data.tracked ?? []
}
