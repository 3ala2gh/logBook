import type { DutyStatus, StopType } from '@/types'

interface StopStyle {
  /** Stops are colored by the duty status they are logged in. */
  status: DutyStatus
  glyph: string
  name: string
}

export const STOP_META: Record<StopType, StopStyle> = {
  start: { status: 'ON', glyph: 'A', name: 'Start' },
  pickup: { status: 'ON', glyph: 'P', name: 'Pickup' },
  dropoff: { status: 'ON', glyph: 'D', name: 'Drop-off' },
  fuel: { status: 'ON', glyph: 'F', name: 'Fuel' },
  break: { status: 'OFF', glyph: '½', name: '30-min break' },
  rest: { status: 'SB', glyph: 'Z', name: '10-hr rest' },
  restart: { status: 'OFF', glyph: '34', name: '34-hr restart' },
  inspection: { status: 'ON', glyph: 'i', name: 'Inspection' },
}

/** Trip endpoints get bigger markers and sit above other stops. */
export const MAJOR_STOPS: readonly StopType[] = ['start', 'pickup', 'dropoff']
