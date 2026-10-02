import L from 'leaflet'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

/** Zoom buttons top-right, away from the legend. */
export function ZoomControl() {
  const map = useMap()
  useEffect(() => {
    const control = L.control.zoom({ position: 'topright' }).addTo(map)
    return () => {
      control.remove()
    }
  }, [map])
  return null
}
