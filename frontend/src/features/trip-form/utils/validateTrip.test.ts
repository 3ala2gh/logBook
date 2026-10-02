import { describe, expect, it } from 'vitest'
import type { TripFormValues } from '../types'
import { toPlanRequest, validateTrip } from './validateTrip'

const DALLAS = { label: 'Dallas, TX', lat: 32.78, lng: -96.8 }
const DENVER = { label: 'Denver, CO', lat: 39.74, lng: -104.99 }

const valid: TripFormValues = {
  current: DALLAS,
  pickup: DALLAS,
  dropoff: DENVER,
  cycleUsedHours: '12.5',
  startTime: '',
  logDetails: {},
}

describe('validateTrip', () => {
  it('accepts a complete trip, including current location = pickup', () => {
    expect(validateTrip(valid)).toEqual({})
  })

  it('requires every location to be picked from the suggestions', () => {
    const errors = validateTrip({ ...valid, current: null, pickup: null, dropoff: null })
    expect(Object.keys(errors)).toEqual(['current', 'pickup', 'dropoff'])
  })

  it.each(['', '-1', '70.5', 'abc'])('rejects cycle hours %j', (cycleUsedHours) => {
    expect(validateTrip({ ...valid, cycleUsedHours }).cycle_used_hours).toMatch(/0 to 70/)
  })

  it('rejects a drop-off at the pickup', () => {
    expect(validateTrip({ ...valid, dropoff: DALLAS }).dropoff).toMatch(/different/)
  })
})

describe('toPlanRequest', () => {
  it('sends numbers and null for "leave now"', () => {
    expect(toPlanRequest(valid)).toMatchObject({ cycle_used_hours: 12.5, start_time: null })
  })
})
