/** Every API error has this shape (backend/trips/errors.py). */
export interface ApiErrorBody {
  error: {
    code: 'VALIDATION' | 'UNROUTABLE' | 'PROVIDER_DOWN' | 'INTERNAL' | 'HTTP_ERROR' | (string & {})
    message: string
    field?: string
  }
}
