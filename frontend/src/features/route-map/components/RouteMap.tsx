import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo, useRef } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { TripPlan } from '@/types'
import { TILE_ATTRIBUTION, TILE_URL, US_CENTER, US_ZOOM } from '../constants'
import { FitRoute } from './controls/FitRoute'
import { FocusStop } from './controls/FocusStop'
import { ZoomControl } from './controls/ZoomControl'
import { MapLegend } from './MapLegend'
import { EmptyMapOverlay, LoadingMapOverlay } from './MapOverlays'
import { RouteLines } from './RouteLines'
import { StopMarkers } from './StopMarkers'

interface RouteMapProps {
  plan: TripPlan | null
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

export function RouteMap({ plan, loading, selectedId, onSelect }: RouteMapProps) {
  const markers = useRef(new Map<string, L.Marker>())
  const bounds = useMemo(() => {
    const points = plan?.route.legs.flatMap((leg) => leg.geometry) ?? []
    return points.length ? L.latLngBounds(points) : null
  }, [plan])
  const selected = plan?.stops.find((stop) => stop.id === selectedId) ?? null

  return (
    <div className="relative h-full min-h-90 overflow-hidden rounded-2xl border border-line bg-[#e9e6dd]">
      <MapContainer center={US_CENTER} zoom={US_ZOOM} className="h-full w-full" zoomControl={false}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} className="map-tiles" maxZoom={19} />
        <ZoomControl />
        {plan && (
          <>
            <RouteLines legs={plan.route.legs} />
            <StopMarkers
              stops={plan.stops}
              timeZone={plan.summary.timezone}
              selectedId={selectedId}
              onSelect={onSelect}
              markers={markers}
            />
          </>
        )}
        <FitRoute bounds={bounds} />
        <FocusStop stop={selected} markers={markers} />
      </MapContainer>

      {plan && <MapLegend />}
      {!plan && !loading && <EmptyMapOverlay />}
      {loading && <LoadingMapOverlay />}
    </div>
  )
}
