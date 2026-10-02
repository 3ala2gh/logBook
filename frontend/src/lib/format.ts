// Display formatting. Times are shown in the trip's home-terminal time zone.

/** 510 → "8h 30m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** Hours as the paper log writes them: 10, 1.75, 7.5 */
export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/0$/, '')
}

/** 1435.2 → "1,435 mi" */
export function formatMiles(miles: number): string {
  return `${Math.round(miles).toLocaleString('en-US')} mi`
}

function formatInZone(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(new Date(iso))
}

/** "8:45 PM" */
export function formatTime(iso: string, timeZone: string): string {
  return formatInZone(iso, timeZone, { hour: 'numeric', minute: '2-digit' })
}

/** "Fri, Oct 2" */
export function formatDay(iso: string, timeZone: string): string {
  return formatInZone(iso, timeZone, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "Fri, Oct 2" for a plain "2026-10-02" date (no time zone shift). */
export function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "PDT" */
export function timeZoneAbbr(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(new Date(iso))
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000)
}

export function truncate(text: string | null | undefined, max: number): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
