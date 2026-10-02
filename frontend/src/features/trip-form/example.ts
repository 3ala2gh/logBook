import type { Place } from '../../types/api'

/** A long trip that shows breaks, fuel stops, rests and several log sheets in one click. */
export const EXAMPLE_TRIP: { current: Place; pickup: Place; dropoff: Place; cycle: number } = {
  current: { label: 'Los Angeles, CA', lat: 34.0537, lng: -118.2428 },
  pickup: { label: 'Dallas, TX', lat: 32.7763, lng: -96.7969 },
  dropoff: { label: 'New York, NY', lat: 40.7127, lng: -74.006 },
  cycle: 20,
}
