import { CYCLE_LIMIT_HOURS } from '@/constants'
import type { PlanRequest } from '@/types'
import type { FieldErrors, TripFormValues } from '../types'

export function validateTrip(values: TripFormValues): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.current) errors.current = 'Choose your current location from the suggestions.'
  if (!values.pickup) errors.pickup = 'Choose the pickup location from the suggestions.'
  if (!values.dropoff) errors.dropoff = 'Choose the drop-off location from the suggestions.'

  const hours = Number(values.cycleUsedHours)
  if (values.cycleUsedHours.trim() === '' || Number.isNaN(hours) || hours < 0 || hours > CYCLE_LIMIT_HOURS) {
    errors.cycle_used_hours = `Enter the hours already used in this ${CYCLE_LIMIT_HOURS}-hour cycle, from 0 to ${CYCLE_LIMIT_HOURS}.`
  }

  const { pickup, dropoff } = values
  if (pickup && dropoff && pickup.lat === dropoff.lat && pickup.lng === dropoff.lng) {
    errors.dropoff = 'Drop-off must be different from the pickup location.'
  }
  return errors
}

/** Only call once validateTrip() returned no errors. */
export function toPlanRequest(values: TripFormValues): PlanRequest {
  if (!values.current || !values.pickup || !values.dropoff) throw new Error('Trip form is incomplete')
  return {
    current: values.current,
    pickup: values.pickup,
    dropoff: values.dropoff,
    cycle_used_hours: Number(values.cycleUsedHours),
    start_time: values.startTime || null,
    log_details: values.logDetails,
  }
}
