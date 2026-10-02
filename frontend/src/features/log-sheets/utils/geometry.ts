import type { DaySegment, DutyStatus } from '@/types'
import { GRID_ROWS, GRID_X, HOUR_W, ROW_H, ROW_TOP } from '../constants'

/** x of a minute since midnight on the grid. */
export function minuteX(minute: number): number {
  return GRID_X + (minute / 60) * HOUR_W
}

export function rowIndex(status: DutyStatus): number {
  return GRID_ROWS.findIndex((row) => row.status === status)
}

export function rowCenterY(status: DutyStatus): number {
  return ROW_TOP + rowIndex(status) * ROW_H + ROW_H / 2
}

/**
 * One continuous line across the day: horizontal in the row of the current
 * status, vertical where the status changes (FMCSA guide p. 17).
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

/** Labels of the hour band: Mid-night, 1…11, Noon, 1…11, Mid-night. */
export function hourLabel(hour: number): string[] {
  if (hour === 0 || hour === 24) return ['Mid-', 'night']
  if (hour === 12) return ['Noon']
  return [String(hour % 12)]
}
