export interface HealthResponse {
  status: string
}

export type HealthStatus = 'loading' | 'ok' | 'error'
