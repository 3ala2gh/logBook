import axios, { AxiosError } from 'axios'
import type { ApiErrorBody } from '@/types'

/** In dev, Vite proxies /api to Django (vite.config.ts); in production VITE_API_URL points at Render. */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

export class ApiError extends Error {
  readonly code: string
  readonly field?: string

  constructor(message: string, code: string, field?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.field = field
  }

  get cancelled(): boolean {
    return this.code === 'CANCELLED'
  }
}

/** Turn any request failure into a message a person can act on. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) return new ApiError('Request cancelled.', 'CANCELLED')
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined
    if (body?.error) return new ApiError(body.error.message, body.error.code, body.error.field)
    if (error.response?.status === 429) {
      return new ApiError('Too many requests. Please wait a few seconds and try again.', 'THROTTLED')
    }
    if (!error.response) {
      return new ApiError("Can't reach the planning server. Check your connection and try again.", 'NETWORK')
    }
  }
  return new ApiError('Something went wrong. Please try again.', 'UNKNOWN')
}
