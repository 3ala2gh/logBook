import { formatDay, formatDuration, formatMiles, formatTime, timeZoneAbbr } from '../../../lib/format'
import type { Summary } from '../../../types/api'

function Card({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-3">
      <dt className="text-[12px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-[19px] leading-tight font-semibold text-ink">{value}</dd>
      {detail && <dd className="mt-0.5 text-[12px] text-muted">{detail}</dd>}
    </div>
  )
}

export function SummaryCards({ summary }: { summary: Summary }) {
  const tz = summary.timezone
  const stops = [
    summary.breaks && `${summary.breaks} break${summary.breaks > 1 ? 's' : ''}`,
    summary.fuel_stops && `${summary.fuel_stops} fuel`,
    summary.rests && `${summary.rests} rest${summary.rests > 1 ? 's' : ''}`,
    summary.restarts && `${summary.restarts} restart`,
  ].filter(Boolean)

  return (
    <section aria-labelledby="summary-heading" className="card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="summary-heading" className="text-lg font-semibold">
          Trip summary
        </h2>
        <span className="text-xs text-muted">Times in {timeZoneAbbr(summary.start, tz)} (home terminal)</span>
      </div>
      <dl className="grid grid-cols-2 gap-2.5">
        <Card label="Distance" value={formatMiles(summary.total_miles)} detail={stops.join(' · ') || 'No stops needed'} />
        <Card label="Driving" value={formatDuration(summary.driving_minutes)} detail="Behind the wheel" />
        <Card
          label="Trip duration"
          value={formatDuration(summary.total_minutes)}
          detail={`${summary.days} log sheet${summary.days > 1 ? 's' : ''}`}
        />
        <Card label="Arrive at receiver" value={formatTime(summary.arrival, tz)} detail={formatDay(summary.arrival, tz)} />
        <Card
          label="Cycle used at end"
          value={`${summary.cycle_used_end} h`}
          detail={`Started at ${summary.cycle_used_start} h${summary.restarts ? ', reset by restart' : ''}`}
        />
        <Card label="Cycle remaining" value={`${summary.cycle_remaining} h`} detail="Of the 70-hour limit" />
      </dl>
    </section>
  )
}
