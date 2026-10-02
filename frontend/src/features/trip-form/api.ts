import { api, toApiError } from '../../lib/axios'
import type { Place, PlanRequest, TripPlan } from '../../types/api'

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  try {
    const res = await api.get<Place[]>('/geocode/', { params: { q: query }, signal })
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function planTrip(body: PlanRequest): Promise<TripPlan> {
  try {
    // Routing plus reverse geocoding can take a while on a cold server.
    const res = await api.post<TripPlan>('/trips/plan/', body, { timeout: 120_000 })
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}
