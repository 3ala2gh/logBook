import { useEffect, useState } from 'react'
import { pingHealth } from '../api'
import { GIVE_UP_AFTER_MS, PING_TIMEOUT_MS, RETRY_EVERY_MS, SLOW_AFTER_MS } from '../constants'
import type { ServerStatus } from '../types'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Pings the API on load and keeps retrying while a sleeping free-tier host boots. */
export function useServerStatus(): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>('checking')

  useEffect(() => {
    let cancelled = false
    const startedAt = Date.now()
    const slowTimer = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === 'checking' ? 'waking' : s))
    }, SLOW_AFTER_MS)

    async function poll() {
      while (!cancelled && Date.now() - startedAt < GIVE_UP_AFTER_MS) {
        try {
          if (await pingHealth(PING_TIMEOUT_MS)) {
            if (!cancelled) setStatus('ready')
            return
          }
        } catch {
          // still booting; try again shortly
        }
        await wait(RETRY_EVERY_MS)
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
