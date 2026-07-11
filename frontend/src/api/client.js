import axios from 'axios'

// Base URL for the FastAPI backend. Hardcoded to localhost for now —
// swap to an env var (import.meta.env.VITE_API_BASE_URL) once we
// deploy to Railway/Vercel in a later phase.
const BASE_URL = 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

export default apiClient