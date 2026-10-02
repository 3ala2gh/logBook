import { useEffect, useState } from 'react'
import { pingHealth } from '../api'

/**
 * checking → ready, or checking → waking → ready when the free-tier host has
 * to boot (it sleeps after 15 idle minutes and takes up to a minute to wake).
 */
export type ServerStatus = 'checking' | 'waking' | 'ready' | 'down'

const SLOW_AFTER_MS = 2500
const GIVE_UP_AFTER_MS = 120_000

export function useServerStatus(): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>('checking')

  useEffect(() => {
    let cancelled = false
    const startedAt = Date.now()
    const slowTimer = setTimeout(() => !cancelled && setStatus((s) => (s === 'checking' ? 'waking' : s)), SLOW_AFTER_MS)

    async function poll() {
      while (!cancelled && Date.now() - startedAt < GIVE_UP_AFTER_MS) {
        try {
          if (await pingHealth(20_000)) {
            if (!cancelled) setStatus('ready')
            return
          }
        } catch {
          // still booting; try again shortly
        }
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
      if (!cancelled) setStatus('down')
    }
    poll()

    return () => {
      cancelled = true
      clearTimeout(slowTimer)
    }
  }, [])

  return status
}
