import { apiClient } from '@/lib/api-client'

export async function pingHealth(timeoutMs: number): Promise<boolean> {
  const res = await apiClient.get<{ status: string }>('/health/', { timeout: timeoutMs })
  return res.data.status === 'ok'
}
