import { api } from '../../lib/axios'
import type { HealthResponse } from './types'

export const getHealth = () =>
  api.get<HealthResponse>('/health/').then((res) => res.data)
