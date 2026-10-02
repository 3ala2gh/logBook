import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { DUTY, STOP_META } from '../../../lib/duty'
import { formatDay, formatDuration, formatTime } from '../../../lib/format'
import type { Stop, TripPlan } from '../../../types/api'

const US_CENTER: L.LatLngTuple = [39.5, -98.35]
const DRIVE_COLOR = DUTY.D.color

interface Props {
  plan: TripPlan | null
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

function stopIcon(stop: Stop, selected: boolean): L.DivIcon {
  const meta = STOP_META[stop.type]
  const major = ['start', 'pickup', 'dropoff'].includes(stop.type)
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

function FitRoute({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds?.isValid()) map.fitBounds(bounds, { padding: [36, 36] })
  }, [map, bounds])
  return null
}

function FocusStop({ stop, markers }: { stop: Stop | null; markers: RefObject<Map<string, L.Marker>> }) {
  const map = useMap()
  useEffect(() => {
    if (!stop) return
    map.flyTo([stop.lat, stop.lng], Math.max(map.getZoom(), 8), { duration: 0.6 })
    const timer = setTimeout(() => markers.current.get(stop.id)?.openPopup(), 650)
    return () => clearTimeout(timer)
  }, [map, stop, markers])
  return null
}

export function RouteMap({ plan, loading, selectedId, onSelect }: Props) {
  const markers = useRef(new Map<string, L.Marker>())
  const bounds = useMemo(() => {
    if (!plan) return null
    const points = plan.route.legs.flatMap((leg) => leg.geometry)
    return points.length ? L.latLngBounds(points) : null
  }, [plan])
  const selected = plan?.stops.find((s) => s.id === selectedId) ?? null
  const tz = plan?.summary.timezone ?? 'UTC'

  return (
    <div className="relative h-full min-h-90 overflow-hidden rounded-2xl border border-line bg-[#e9e6dd]">
      <MapContainer center={US_CENTER} zoom={4} className="h-full w-full" zoomControl={false} attributionControl>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles"
          maxZoom={19}
        />
        <ZoomControlTopRight />
        {plan?.route.legs.map((leg, i) =>
          leg.geometry.length > 1 ? (
            <Polyline key={`casing-${i}`} positions={leg.geometry} pathOptions={{ color: '#fff', weight: 8, opacity: 0.9 }} />
          ) : null,
        )}
        {plan?.route.legs.map((leg, i) =>
          leg.geometry.length > 1 ? (
            <Polyline
              key={`leg-${i}`}
              positions={leg.geometry}
              pathOptions={
                leg.from === 'current'
                  ? { color: DRIVE_COLOR, weight: 4, opacity: 0.75, dashArray: '2 9', lineCap: 'round' }
                  : { color: DRIVE_COLOR, weight: 5, opacity: 0.95 }
              }
            />
          ) : null,
        )}
        {plan?.stops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={stopIcon(stop, stop.id === selectedId)}
            zIndexOffset={stop.id === selectedId ? 1000 : ['pickup', 'dropoff', 'start'].includes(stop.type) ? 500 : 0}
            keyboard
            title={`${stop.label}: ${stop.place ?? ''}`}
            eventHandlers={{ click: () => onSelect(stop.id) }}
            ref={(marker) => {
              if (marker) markers.current.set(stop.id, marker)
              else markers.current.delete(stop.id)
            }}
          >
            <Popup>
              <div className="min-w-48 text-ink">
                <p className="text-[15px] font-semibold">{stop.label}</p>
                <p className="text-[13px] text-ink-soft">{stop.place}</p>
                <p className="mt-1.5 font-mono text-[12px]">
                  {formatDay(stop.arrive, tz)} · {formatTime(stop.arrive, tz)}
                  {stop.duration_minutes > 0 && ` – ${formatTime(stop.depart, tz)}`}
                </p>
                <p className="text-[12px] text-muted">
                  {stop.duration_minutes > 0 ? `${formatDuration(stop.duration_minutes)} · ` : ''}mile{' '}
                  {Math.round(stop.mile).toLocaleString('en-US')}
                </p>
                {stop.reason && <p className="mt-1 text-[12px] text-ink-soft">{stop.reason}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
        <FitRoute bounds={bounds} />
        <FocusStop stop={selected} markers={markers} />
      </MapContainer>

      {plan && <MapLegend />}

      {!plan && !loading && (
        <div className="pointer-events-none absolute inset-0 z-500 grid place-items-center p-6">
          <div className="max-w-xs rounded-2xl bg-white/90 px-5 py-4 text-center shadow-lg backdrop-blur">
            <p className="font-semibold">Your route will appear here</p>
            <p className="mt-1 text-sm text-muted">
              Enter a trip, or press <span className="font-medium text-ink">Try an example</span> to see a coast-to-coast
              run.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-500 grid place-items-center bg-paper/55 backdrop-blur-[2px]" role="status">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3.5 shadow-lg">
            <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-line border-t-ink" />
            <span className="text-sm font-medium">Finding a truck route and planning stops…</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ZoomControlTopRight() {
  const map = useMap()
  useEffect(() => {
    const control = L.control.zoom({ position: 'topright' }).addTo(map)
    return () => {
      control.remove()
    }
  }, [map])
  return null
}

function MapLegend() {
  const items = [
    { status: 'D' as const, label: 'Driving' },
    { status: 'ON' as const, label: 'On duty' },
    { status: 'OFF' as const, label: 'Off duty' },
    { status: 'SB' as const, label: 'Sleeper' },
  ]
  return (
    <div className="absolute bottom-3 left-3 z-500 rounded-xl bg-white/95 px-3 py-2.5 text-[12px] shadow-md backdrop-blur">
      <div className="flex items-center gap-2">
        <svg width="28" height="6" aria-hidden>
          <line x1="2" y1="3" x2="26" y2="3" stroke={DRIVE_COLOR} strokeWidth="4" strokeDasharray="1 6" strokeLinecap="round" />
        </svg>
        To pickup
        <svg width="28" height="6" aria-hidden className="ml-2">
          <line x1="0" y1="3" x2="28" y2="3" stroke={DRIVE_COLOR} strokeWidth="4" />
        </svg>
        Loaded
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {items.map((item) => (
          <span key={item.status} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: DUTY[item.status].color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
