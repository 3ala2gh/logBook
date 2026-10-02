import { ColorDot } from '@/components/ui'
import { DUTY, DUTY_ORDER } from '@/constants'
import { formatHours } from '@/lib/format'
import type { DailyLog } from '@/types'

function Row({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="flex items-center gap-2 text-ink-soft">
        {dot && <ColorDot color={dot} />}
        {label}
      </dt>
      <dd className="font-mono font-semibold">{value}</dd>
    </div>
  )
}

export function DaySummary({ log, dayNumber }: { log: DailyLog; dayNumber: number }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold">Day {dayNumber} at a glance</h3>
      <dl className="mt-3 space-y-2">
        {DUTY_ORDER.map((status) => (
          <Row key={status} label={DUTY[status].label} value={`${formatHours(log.totals[status])} h`} dot={DUTY[status].color} />
        ))}
        <div className="space-y-2 border-t border-line pt-2">
          <Row label="Miles driven" value={String(Math.round(log.miles_driving))} />
          <Row label="70-hr total at end of day" value={`${formatHours(log.recap.cycle_total)} h`} />
        </div>
      </dl>
      {log.recap.restart_note && (
        <p className="mt-3 rounded-lg bg-duty-off/10 px-3 py-2 text-[13px] text-ink-soft">{log.recap.restart_note}</p>
      )}
    </div>
  )
}
