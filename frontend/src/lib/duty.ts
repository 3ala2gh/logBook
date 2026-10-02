import type { DutyStatus, StopType } from '../types/api'

/** The four duty statuses, in log-grid row order, with one color each everywhere. */
export const DUTY: Record<DutyStatus, { label: string; short: string; color: string; bg: string; text: string }> = {
  OFF: { label: 'Off Duty', short: 'Off', color: '#64748b', bg: 'bg-duty-off', text: 'text-duty-off' },
  SB: { label: 'Sleeper Berth', short: 'Sleeper', color: '#6366f1', bg: 'bg-duty-sb', text: 'text-duty-sb' },
  D: { label: 'Driving', short: 'Driving', color: '#059669', bg: 'bg-duty-d', text: 'text-duty-d' },
  ON: { label: 'On Duty (not driving)', short: 'On duty', color: '#d97706', bg: 'bg-duty-on', text: 'text-duty-on' },
}

export const DUTY_ORDER: DutyStatus[] = ['OFF', 'SB', 'D', 'ON']

/** How each kind of stop is drawn: its duty-status color and a short glyph. */
export const STOP_META: Record<StopType, { status: DutyStatus; glyph: string; name: string }> = {
  start: { status: 'ON', glyph: 'A', name: 'Start' },
  pickup: { status: 'ON', glyph: 'P', name: 'Pickup' },
  dropoff: { status: 'ON', glyph: 'D', name: 'Drop-off' },
  fuel: { status: 'ON', glyph: 'F', name: 'Fuel' },
  break: { status: 'OFF', glyph: '½', name: '30-min break' },
  rest: { status: 'SB', glyph: 'Z', name: '10-hr rest' },
  restart: { status: 'OFF', glyph: '34', name: '34-hr restart' },
  inspection: { status: 'ON', glyph: 'i', name: 'Inspection' },
}
