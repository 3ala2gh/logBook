import { useEffect, useState } from 'react'
import { getHealth } from '../api'
import type { HealthStatus } from '../types'

export function useHealth(): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>('loading')

  useEffect(() => {
    getHealth()
      .then((data) => setStatus(data.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setStatus('error'))
  }, [])

  return status
}
