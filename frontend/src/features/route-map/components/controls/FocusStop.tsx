import type { Marker } from 'leaflet'
import { type RefObject, useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { Stop } from '@/types'
import { FLY_DURATION_S, FOCUS_ZOOM } from '../../constants'

interface FocusStopProps {
  stop: Stop | null
  markers: RefObject<Map<string, Marker>>
}

/** Fly to the selected stop and open its popup once the flight lands. */
export function FocusStop({ stop, markers }: FocusStopProps) {
  const map = useMap()
  useEffect(() => {
    if (!stop) return
    map.flyTo([stop.lat, stop.lng], Math.max(map.getZoom(), FOCUS_ZOOM), { duration: FLY_DURATION_S })
    const timer = setTimeout(() => markers.current.get(stop.id)?.openPopup(), FLY_DURATION_S * 1000 + 50)
    return () => clearTimeout(timer)
  }, [map, stop, markers])
  return null
}
