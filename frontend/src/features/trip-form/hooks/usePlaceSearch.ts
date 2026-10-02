import { useEffect, useState } from 'react'
import type { ApiError } from '@/lib/api-client'
import type { Place } from '@/types'
import { searchPlaces } from '../api'
import { SEARCH_DEBOUNCE_MS } from '../constants'

interface PlaceSearch {
  places: Place[]
  /** True once results for the current query have arrived. */
  ready: boolean
  loading: boolean
  error: string | null
}

/**
 * Debounced, cancellable place search. Pass '' to stay idle. Results are kept
 * per query, so a stale response never shows under a newer query.
 */
export function usePlaceSearch(query: string): PlaceSearch {
  const [results, setResults] = useState<{ query: string; places: Place[] }>({ query: '', places: [] })
  const [failed, setFailed] = useState<{ query: string; message: string } | null>(null)

  useEffect(() => {
    if (!query) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        setResults({ query, places: await searchPlaces(query, controller.signal) })
      } catch (err) {
        const apiError = err as ApiError
        if (!apiError.cancelled) setFailed({ query, message: apiError.message })
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const ready = Boolean(query) && results.query === query
  const error = failed?.query === query ? failed.message : null
  return {
    places: ready ? results.places : [],
    ready,
    loading: Boolean(query) && !ready && !error,
    error,
  }
}
