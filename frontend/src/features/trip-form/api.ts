import { apiClient, toApiError } from '@/lib/api-client'
import type { Place, PlanRequest, TripPlan } from '@/types'
import { PLAN_TIMEOUT_MS } from './constants'

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  try {
    const res = await apiClient.get<Place[]>('/geocode/', { params: { q: query }, signal })
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function planTrip(body: PlanRequest): Promise<TripPlan> {
  try {
    const res = await apiClient.post<TripPlan>('/trips/plan/', body, { timeout: PLAN_TIMEOUT_MS })
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}
