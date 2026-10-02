import type { LatLngTuple, PathOptions } from 'leaflet'
import { DUTY } from '@/constants'

export const US_CENTER: LatLngTuple = [39.5, -98.35]
export const US_ZOOM = 4
/** Zoom in at least this far when focusing a stop. */
export const FOCUS_ZOOM = 8
export const FLY_DURATION_S = 0.6
export const FIT_PADDING: [number, number] = [36, 36]

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** The route is driving, so it uses the Driving color; the empty run to pickup is dotted. */
export const ROUTE_STYLE: Record<'casing' | 'deadhead' | 'loaded', PathOptions> = {
  casing: { color: '#fff', weight: 8, opacity: 0.9 },
  deadhead: { color: DUTY.D.color, weight: 4, opacity: 0.75, dashArray: '2 9', lineCap: 'round' },
  loaded: { color: DUTY.D.color, weight: 5, opacity: 0.95 },
}
