import axios from 'axios'

// Production: set VITE_API_BASE_URL on Vercel (e.g. https://your-api.onrender.com)
// Local: falls back to localhost:8000
export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

export default apiClient