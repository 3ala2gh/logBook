import { useRef, useState } from 'react'
import type { ApiError } from '@/lib/api-client'
import type { PlanRequest, TripPlan } from '@/types'
import { planTrip } from '../api'
import type { FieldErrors, TripField } from '../types'

const FORM_FIELDS: readonly string[] = ['current', 'pickup', 'dropoff', 'cycle_used_hours', 'start_time'] satisfies TripField[]

/**
 * Plans trips and keeps the latest result. Errors tied to a form field go to
 * `fieldErrors`; anything else to `error`. Out-of-order responses are ignored.
 */
export function useTripPlanner() {
  const [plan, setPlan] = useState<TripPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const latest = useRef(0)

  async function submit(request: PlanRequest) {
    const id = ++latest.current
    setLoading(true)
    setError(null)
    setFieldErrors(undefined)
    try {
      const result = await planTrip(request)
      if (id === latest.current) setPlan(result)
    } catch (err) {
      if (id !== latest.current) return
      const apiError = err as ApiError
      const field = apiError.field?.split('.')[0]
      if (field && FORM_FIELDS.includes(field)) setFieldErrors({ [field]: apiError.message })
      else setError(apiError.message)
    } finally {
      if (id === latest.current) setLoading(false)
    }
  }

  return { plan, loading, error, fieldErrors, submit }
}
