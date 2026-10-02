import { formatDay, formatDuration, formatTime } from '@/lib/format'
import type { Stop } from '@/types'

export function StopPopup({ stop, timeZone }: { stop: Stop; timeZone: string }) {
  const hasDuration = stop.duration_minutes > 0
  return (
    <div className="min-w-48 text-ink">
      <p className="text-[15px] font-semibold">{stop.label}</p>
      <p className="text-[13px] text-ink-soft">{stop.place}</p>
      <p className="mt-1.5 font-mono text-[12px]">
        {formatDay(stop.arrive, timeZone)} · {formatTime(stop.arrive, timeZone)}
        {hasDuration && ` – ${formatTime(stop.depart, timeZone)}`}
      </p>
      <p className="text-[12px] text-muted">
        {hasDuration && `${formatDuration(stop.duration_minutes)} · `}mile {Math.round(stop.mile).toLocaleString('en-US')}
      </p>
      {stop.reason && <p className="mt-1 text-[12px] text-ink-soft">{stop.reason}</p>}
    </div>
  )
}
