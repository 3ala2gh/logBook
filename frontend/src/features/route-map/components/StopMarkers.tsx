import type { Marker as LeafletMarker } from 'leaflet'
import type { RefObject } from 'react'
import { Marker, Popup } from 'react-leaflet'
import type { Stop } from '@/types'
import { stopIcon, stopZIndex } from '../utils/stopIcon'
import { StopPopup } from './StopPopup'

interface StopMarkersProps {
  stops: Stop[]
  timeZone: string
  selectedId: string | null
  onSelect: (id: string) => void
  /** Filled with each stop's Leaflet marker so FocusStop can open its popup. */
  markers: RefObject<Map<string, LeafletMarker>>
}

export function StopMarkers({ stops, timeZone, selectedId, onSelect, markers }: StopMarkersProps) {
  return stops.map((stop) => {
    const selected = stop.id === selectedId
    return (
      <Marker
        key={stop.id}
        position={[stop.lat, stop.lng]}
        icon={stopIcon(stop, selected)}
        zIndexOffset={stopZIndex(stop, selected)}
        keyboard
        title={`${stop.label}: ${stop.place ?? ''}`}
        eventHandlers={{ click: () => onSelect(stop.id) }}
        ref={(marker) => {
          if (marker) markers.current.set(stop.id, marker)
          else markers.current.delete(stop.id)
        }}
      >
        <Popup>
          <StopPopup stop={stop} timeZone={timeZone} />
        </Popup>
      </Marker>
    )
  })
}
