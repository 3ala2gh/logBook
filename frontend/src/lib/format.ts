export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** Hours as the paper log writes them: 10, 1.75, 7.75 */
export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/0$/, '')
}

export function formatMiles(miles: number): string {
  return `${Math.round(miles).toLocaleString('en-US')} mi`
}

function fmt(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(new Date(iso))
}

export function formatTime(iso: string, timeZone: string): string {
  return fmt(iso, timeZone, { hour: 'numeric', minute: '2-digit' })
}

export function formatDay(iso: string, timeZone: string): string {
  return fmt(iso, timeZone, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatDateTime(iso: string, timeZone: string): string {
  return `${formatDay(iso, timeZone)} · ${formatTime(iso, timeZone)}`
}

export function timeZoneAbbr(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(new Date(iso))
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone
}

/** "06:15" from minutes since midnight */
export function clock(minute: number): string {
  const h = Math.floor(minute / 60) % 24
  const m = minute % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
