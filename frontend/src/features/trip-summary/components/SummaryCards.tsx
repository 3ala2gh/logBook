import { CYCLE_LIMIT_HOURS } from '@/constants'
import { formatDay, formatDuration, formatMiles, formatTime, timeZoneAbbr } from '@/lib/format'
import type { TripSummary } from '@/types'
import { describeStops } from '../utils/describeStops'
import { StatCard } from './StatCard'

export function SummaryCards({ summary }: { summary: TripSummary }) {
  const tz = summary.timezone
  return (
    <section aria-labelledby="summary-heading" className="card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="summary-heading" className="text-lg font-semibold">
          Trip summary
        </h2>
        <span className="text-xs text-muted">Times in {timeZoneAbbr(summary.start, tz)} (home terminal)</span>
      </div>
      <dl className="grid grid-cols-2 gap-2.5">
        <StatCard label="Distance" value={formatMiles(summary.total_miles)} detail={describeStops(summary)} />
        <StatCard label="Driving" value={formatDuration(summary.driving_minutes)} detail="Behind the wheel" />
        <StatCard
          label="Trip duration"
          value={formatDuration(summary.total_minutes)}
          detail={`${summary.days} log sheet${summary.days > 1 ? 's' : ''}`}
        />
        <StatCard label="Arrive at receiver" value={formatTime(summary.arrival, tz)} detail={formatDay(summary.arrival, tz)} />
        <StatCard
          label="Cycle used at end"
          value={`${summary.cycle_used_end} h`}
          detail={`Started at ${summary.cycle_used_start} h${summary.restarts ? ', reset by restart' : ''}`}
        />
        <StatCard label="Cycle remaining" value={`${summary.cycle_remaining} h`} detail={`Of the ${CYCLE_LIMIT_HOURS}-hour limit`} />
      </dl>
    </section>
  )
}
