import { CYCLE_LIMIT_HOURS, SLOT_HOURS } from '@/constants'
import { formatHours } from '@/lib/format'

interface CycleHoursFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

/** Hours already used in the 70-hour / 8-day cycle: a slider and a number box kept in sync. */
export function CycleHoursField({ value, onChange, error }: CycleHoursFieldProps) {
  const hours = Math.min(CYCLE_LIMIT_HOURS, Math.max(0, Number(value) || 0))
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor="cycle" className="field-label">
          Current cycle used
        </label>
        <span className="font-mono text-xs text-muted">
          {formatHours(CYCLE_LIMIT_HOURS - hours)} h left of {CYCLE_LIMIT_HOURS}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={CYCLE_LIMIT_HOURS}
          step={SLOT_HOURS}
          value={hours}
          onChange={(e) => onChange(e.target.value)}
          className="h-2 flex-1 cursor-pointer accent-ink"
          aria-label="Current cycle used, slider"
        />
        <div className="relative w-28">
          <input
            id="cycle"
            type="number"
            inputMode="decimal"
            min={0}
            max={CYCLE_LIMIT_HOURS}
            step={SLOT_HOURS}
            className={`field pr-8 font-mono ${error ? 'border-red-400' : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="cycle-help"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">h</span>
        </div>
      </div>
      <p id="cycle-help" className={`mt-1.5 text-[13px] ${error ? 'text-red-600' : 'text-muted'}`}>
        {error ?? `On-duty hours already used in the ${CYCLE_LIMIT_HOURS}-hour / 8-day cycle.`}
      </p>
    </div>
  )
}
