import type { LogDetails, Place } from '@/types'

export type LocationField = 'current' | 'pickup' | 'dropoff'

/** Fields that can carry a validation message (from the form or from the API). */
export type TripField = LocationField | 'cycle_used_hours' | 'start_time'

export type FieldErrors = Partial<Record<TripField, string>>

export interface TripFormValues {
  current: Place | null
  pickup: Place | null
  dropoff: Place | null
  /** Kept as text so the input can be empty or mid-edit. */
  cycleUsedHours: string
  /** datetime-local value, or '' for "leave now". */
  startTime: string
  logDetails: Partial<LogDetails>
}
