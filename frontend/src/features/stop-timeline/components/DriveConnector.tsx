import { formatDuration, formatMiles } from '@/lib/format'

/** The driving between two stops. */
export function DriveConnector({ minutes, miles }: { minutes: number; miles: number }) {
  return (
    <div className="flex items-center gap-3 py-1 pl-6.25 text-[13px] text-muted">
      <span aria-hidden className="h-7 border-l-2 border-duty-d/60" />
      <span>
        <span className="font-medium text-duty-d">Drive</span> {formatDuration(minutes)} · {formatMiles(miles)}
      </span>
    </div>
  )
}
