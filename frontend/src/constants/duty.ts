import type { DutyStatus } from '@/types'

interface DutyStyle {
  label: string
  short: string
  /** Hex value, for the map and SVG. The same colors are Tailwind tokens (bg-duty-*) in index.css. */
  color: string
}

/** One color per duty status, used everywhere: map, timeline, logs. */
export const DUTY: Record<DutyStatus, DutyStyle> = {
  OFF: { label: 'Off Duty', short: 'Off duty', color: '#64748b' },
  SB: { label: 'Sleeper Berth', short: 'Sleeper', color: '#6366f1' },
  D: { label: 'Driving', short: 'Driving', color: '#059669' },
  ON: { label: 'On Duty (not driving)', short: 'On duty', color: '#d97706' },
}

/** Row order on the log grid. */
export const DUTY_ORDER: readonly DutyStatus[] = ['OFF', 'SB', 'D', 'ON']
