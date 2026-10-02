import type { DaySegment, DutyStatus, Remark } from '../../types/api'

// Layout of the SVG log sheet (viewBox units). The form is drawn at 1000 x 1020.
export const SHEET_W = 1000
export const SHEET_H = 1020

export const GRID_X = 170
export const HOUR_W = 30
export const GRID_W = HOUR_W * 24
export const GRID_END = GRID_X + GRID_W
export const BAND_Y = 296
export const BAND_H = 32
export const ROW_TOP = BAND_Y + BAND_H
export const ROW_H = 36
export const GRID_BOTTOM = ROW_TOP + ROW_H * 4
export const TOTALS_X = 933

export const ROWS: { status: DutyStatus; label: string[] }[] = [
  { status: 'OFF', label: ['1. Off Duty'] },
  { status: 'SB', label: ['2. Sleeper', 'Berth'] },
  { status: 'D', label: ['3. Driving'] },
  { status: 'ON', label: ['4. On Duty', '(not driving)'] },
]

export function minuteX(minute: number): number {
  return GRID_X + (minute / 60) * HOUR_W
}

export function rowIndex(status: DutyStatus): number {
  return ROWS.findIndex((row) => row.status === status)
}

export function rowCenterY(status: DutyStatus): number {
  return ROW_TOP + rowIndex(status) * ROW_H + ROW_H / 2
}

/**
 * One continuous line across the day: horizontal in the row of the current
 * status, vertical where the status changes.
 */
export function dutyPath(segments: DaySegment[]): string {
  if (!segments.length) return ''
  const parts = [`M ${minuteX(segments[0].start_minute)} ${rowCenterY(segments[0].status)}`]
  segments.forEach((seg, i) => {
    parts.push(`H ${minuteX(seg.end_minute)}`)
    const next = segments[i + 1]
    if (next && next.status !== seg.status) parts.push(`V ${rowCenterY(next.status)}`)
  })
  return parts.join(' ')
}

export interface RemarkGroup {
  start: number // minute of the first status change in the group
  end: number // minute of the last
  place: string
  activity: string
}

/**
 * Consecutive status changes at the same place become one bracket, the way
 * the FMCSA example writes "Fredericksburg, VA" once under the whole stop.
 */
export function groupRemarks(remarks: Remark[]): RemarkGroup[] {
  const groups: (RemarkGroup & { activities: string[] })[] = []
  for (const remark of remarks) {
    const place = remark.place ?? ''
    const last = groups.at(-1)
    if (last && last.place === place) {
      last.end = remark.minute
      last.activities.push(remark.activity)
    } else {
      groups.push({ start: remark.minute, end: remark.minute, place, activity: '', activities: [remark.activity] })
    }
  }
  return groups.map(({ activities, ...group }) => {
    const stops = activities.filter((a) => a !== 'Driving')
    return { ...group, activity: (stops.length ? [...new Set(stops)] : activities.slice(0, 1)).join(', ') }
  })
}

export function hourLabel(hour: number): string[] {
  if (hour === 0 || hour === 24) return ['Mid-', 'night']
  if (hour === 12) return ['Noon']
  return [String(hour % 12)]
}
