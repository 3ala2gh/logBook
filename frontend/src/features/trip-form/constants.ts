import type { LogDetails, Place } from '@/types'
import type { LocationField } from './types'

export const MIN_SEARCH_CHARS = 3
export const SEARCH_DEBOUNCE_MS = 300
/** Routing plus reverse geocoding can take a while on a cold server. */
export const PLAN_TIMEOUT_MS = 120_000

export const LOCATION_FIELDS: Record<LocationField, { label: string; placeholder: string; glyph: string; markerClass: string }> = {
  current: { label: 'Current location', placeholder: 'Where is the truck now?', glyph: 'A', markerClass: 'bg-ink' },
  pickup: { label: 'Pickup', placeholder: 'Shipper city or address', glyph: 'P', markerClass: 'bg-duty-on' },
  dropoff: { label: 'Drop-off', placeholder: 'Receiver city or address', glyph: 'D', markerClass: 'bg-duty-d' },
}

/** Placeholders match the backend defaults (services/trip_plan.py DEFAULT_LOG_DETAILS). */
export const LOG_DETAIL_FIELDS: { key: keyof LogDetails; label: string; placeholder: string }[] = [
  { key: 'driver_name', label: 'Driver name', placeholder: 'Alex Driver' },
  { key: 'co_driver', label: 'Co-driver', placeholder: 'None' },
  { key: 'carrier', label: 'Carrier', placeholder: 'Demo Freight Lines' },
  { key: 'main_office', label: 'Main office address', placeholder: 'Dallas, TX' },
  { key: 'home_terminal', label: 'Home terminal address', placeholder: 'Current location' },
  { key: 'truck_number', label: 'Truck / tractor no.', placeholder: 'TRK 101' },
  { key: 'trailer_number', label: 'Trailer no.', placeholder: 'TRL 2048' },
  { key: 'manifest_number', label: 'DVL / manifest no.', placeholder: 'BOL-104233' },
  { key: 'shipper', label: 'Shipper', placeholder: 'Acme Distribution' },
  { key: 'commodity', label: 'Commodity', placeholder: 'General freight' },
]

/** A long trip that shows breaks, fuel stops, rests and several log sheets in one click. */
export const EXAMPLE_TRIP: { current: Place; pickup: Place; dropoff: Place; cycleUsedHours: number } = {
  current: { label: 'Los Angeles, CA', lat: 34.0537, lng: -118.2428 },
  pickup: { label: 'Dallas, TX', lat: 32.7763, lng: -96.7969 },
  dropoff: { label: 'New York, NY', lat: 40.7127, lng: -74.006 },
  cycleUsedHours: 20,
}
