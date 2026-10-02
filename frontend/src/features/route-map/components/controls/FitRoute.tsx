import type { LatLngBounds } from 'leaflet'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { FIT_PADDING } from '../../constants'

/** Fit the map to the route whenever a new plan arrives. */
export function FitRoute({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds?.isValid()) map.fitBounds(bounds, { padding: FIT_PADDING })
  }, [map, bounds])
  return null
}
