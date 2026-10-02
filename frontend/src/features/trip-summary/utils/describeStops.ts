import type { TripSummary } from '@/types'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** "2 breaks · 3 fuel · 3 rests · 1 restart" */
export function describeStops(summary: TripSummary): string {
  const parts = [
    summary.breaks && plural(summary.breaks, 'break'),
    summary.fuel_stops && `${summary.fuel_stops} fuel`,
    summary.rests && plural(summary.rests, 'rest'),
    summary.restarts && plural(summary.restarts, 'restart'),
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'No stops needed'
}
