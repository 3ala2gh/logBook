import L from 'leaflet'
import { DUTY, MAJOR_STOPS, STOP_META } from '@/constants'
import type { Stop } from '@/types'

/** A round marker in the stop's duty-status color with its glyph; bigger for endpoints and selection. */
export function stopIcon(stop: Stop, selected: boolean): L.DivIcon {
  const meta = STOP_META[stop.type]
  const major = MAJOR_STOPS.includes(stop.type)
  const size = (major ? 34 : 28) + (selected ? 6 : 0)
  const ring = selected ? '0 0 0 4px rgba(29,78,216,0.35),' : ''
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;
      background:${DUTY[meta.status].color};color:#fff;font:700 ${major ? 13 : 12}px 'IBM Plex Sans',sans-serif;
      border:2.5px solid #fff;box-shadow:${ring}0 2px 6px rgba(15,30,61,.35)">${meta.glyph}</span>`,
  })
}

export function stopZIndex(stop: Stop, selected: boolean): number {
  if (selected) return 1000
  return MAJOR_STOPS.includes(stop.type) ? 500 : 0
}
