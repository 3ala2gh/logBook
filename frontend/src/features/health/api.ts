import { api } from '../../lib/axios'

export const pingHealth = (timeoutMs: number) =>
  api.get<{ status: string }>('/health/', { timeout: timeoutMs }).then((res) => res.data.status === 'ok')
