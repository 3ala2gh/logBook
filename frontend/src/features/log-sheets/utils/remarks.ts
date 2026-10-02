import type { Remark } from '@/types'

export interface RemarkGroup {
  /** Minute of the first status change in the group. */
  start: number
  /** Minute of the last one. */
  end: number
  place: string
  activity: string
}

/**
 * Consecutive status changes at the same place become one bracket, the way
 * the FMCSA example writes "Fredericksburg, VA" once under the whole stop.
 * The label names the stop's activities, not the driving that resumes after it.
 */
export function groupRemarks(remarks: Remark[]): RemarkGroup[] {
  const groups: { start: number; end: number; place: string; activities: string[] }[] = []
  for (const remark of remarks) {
    const place = remark.place ?? ''
    const last = groups.at(-1)
    if (last && last.place === place) {
      last.end = remark.minute
      last.activities.push(remark.activity)
    } else {
      groups.push({ start: remark.minute, end: remark.minute, place, activities: [remark.activity] })
    }
  }
  return groups.map(({ activities, ...group }) => {
    const stops = activities.filter((activity) => activity !== 'Driving')
    const named = stops.length ? [...new Set(stops)] : activities.slice(0, 1)
    return { ...group, activity: named.join(', ') }
  })
}
