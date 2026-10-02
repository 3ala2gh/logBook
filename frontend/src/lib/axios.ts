import axios from 'axios'

// In dev, Vite proxies /api to Django (see vite.config.ts).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})
