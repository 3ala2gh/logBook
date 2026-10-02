import { useState } from 'react'
import type { LogDetails, Place, PlanRequest } from '../../../types/api'
import { EXAMPLE_TRIP } from '../example'
import { LocationAutocomplete } from './LocationAutocomplete'
import { LogDetailsFields } from './LogDetailsFields'

type Field = 'current' | 'pickup' | 'dropoff' | 'cycle_used_hours' | 'start_time'
export type FieldErrors = Partial<Record<Field, string>>

interface Props {
  loading: boolean
  serverErrors?: FieldErrors
  onSubmit: (request: PlanRequest) => void
}

const MARKERS = {
  current: { glyph: 'A', className: 'bg-ink' },
  pickup: { glyph: 'P', className: 'bg-duty-on' },
  dropoff: { glyph: 'D', className: 'bg-duty-d' },
}

export function TripForm({ loading, serverErrors, onSubmit }: Props) {
  const [current, setCurrent] = useState<Place | null>(null)
  const [pickup, setPickup] = useState<Place | null>(null)
  const [dropoff, setDropoff] = useState<Place | null>(null)
  const [cycle, setCycle] = useState('0')
  const [startTime, setStartTime] = useState('')
  const [details, setDetails] = useState<Partial<LogDetails>>({})
  const [localErrors, setErrors] = useState<FieldErrors>({})
  // The parent clears server errors on every submit; local checks take priority.
  const errors: FieldErrors = { ...serverErrors, ...localErrors }

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (!current) next.current = 'Choose your current location from the suggestions.'
    if (!pickup) next.pickup = 'Choose the pickup location from the suggestions.'
    if (!dropoff) next.dropoff = 'Choose the drop-off location from the suggestions.'
    const hours = Number(cycle)
    if (cycle.trim() === '' || Number.isNaN(hours) || hours < 0 || hours > 70) {
      next.cycle_used_hours = 'Enter the hours already used in this 70-hour cycle, from 0 to 70.'
    }
    if (pickup && dropoff && pickup.lat === dropoff.lat && pickup.lng === dropoff.lng) {
      next.dropoff = 'Drop-off must be different from the pickup location.'
    }
    return next
  }

  function submit(request?: PlanRequest) {
    if (request) return onSubmit(request)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return
    }
    onSubmit({
      current: current!,
      pickup: pickup!,
      dropoff: dropoff!,
      cycle_used_hours: Number(cycle),
      start_time: startTime || null,
      log_details: details,
    })
  }

  function tryExample() {
    setCurrent(EXAMPLE_TRIP.current)
    setPickup(EXAMPLE_TRIP.pickup)
    setDropoff(EXAMPLE_TRIP.dropoff)
    setCycle(String(EXAMPLE_TRIP.cycle))
    setErrors({})
    submit({
      current: EXAMPLE_TRIP.current,
      pickup: EXAMPLE_TRIP.pickup,
      dropoff: EXAMPLE_TRIP.dropoff,
      cycle_used_hours: EXAMPLE_TRIP.cycle,
      start_time: startTime || null,
      log_details: details,
    })
  }

  const cycleNumber = Math.min(70, Math.max(0, Number(cycle) || 0))

  return (
    <form
      className="card p-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Plan a trip</h2>
          <p className="text-sm text-muted">Route, required stops, and daily logs in one go.</p>
        </div>
        <button type="button" className="btn-secondary shrink-0 px-3 py-2 text-sm" onClick={tryExample} disabled={loading}>
          Try an example
        </button>
      </div>

      <div className="relative space-y-3.5">
        <span aria-hidden className="absolute top-12 bottom-12 left-5.75 border-l-2 border-dashed border-line" />
        <LocationAutocomplete
          label="Current location"
          marker={MARKERS.current}
          value={current}
          onChange={setCurrent}
          placeholder="Where is the truck now?"
          error={errors.current}
        />
        <LocationAutocomplete
          label="Pickup"
          marker={MARKERS.pickup}
          value={pickup}
          onChange={setPickup}
          placeholder="Shipper city or address"
          error={errors.pickup}
        />
        <LocationAutocomplete
          label="Drop-off"
          marker={MARKERS.dropoff}
          value={dropoff}
          onChange={setDropoff}
          placeholder="Receiver city or address"
          error={errors.dropoff}
        />
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="cycle" className="field-label">
            Current cycle used
          </label>
          <span className="font-mono text-xs text-muted">{(70 - cycleNumber).toFixed(2).replace(/\.00$/, '')} h left of 70</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={70}
            step={0.25}
            value={cycleNumber}
            onChange={(e) => setCycle(e.target.value)}
            className="h-2 flex-1 cursor-pointer accent-ink"
            aria-label="Current cycle used, slider"
          />
          <div className="relative w-28">
            <input
              id="cycle"
              type="number"
              inputMode="decimal"
              min={0}
              max={70}
              step={0.25}
              className={`field pr-8 font-mono ${errors.cycle_used_hours ? 'border-red-400' : ''}`}
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              aria-invalid={Boolean(errors.cycle_used_hours)}
              aria-describedby="cycle-help"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">h</span>
          </div>
        </div>
        <p id="cycle-help" className={`mt-1.5 text-[13px] ${errors.cycle_used_hours ? 'text-red-600' : 'text-muted'}`}>
          {errors.cycle_used_hours ?? 'On-duty hours already used in the 70-hour / 8-day cycle.'}
        </p>
      </div>

      <div className="mt-4">
        <label htmlFor="start" className="field-label">
          Departure <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="start"
          type="datetime-local"
          step={900}
          className="field"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          aria-describedby="start-help"
        />
        <p id="start-help" className="mt-1.5 text-[13px] text-muted">
          {errors.start_time ?? "Home-terminal time at the current location. Leave empty to leave now."}
        </p>
      </div>

      <div className="mt-4">
        <LogDetailsFields value={details} onChange={setDetails} />
      </div>

      <button type="submit" className="btn-primary mt-5 w-full py-3" disabled={loading}>
        {loading ? (
          <>
            <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Planning route…
          </>
        ) : (
          'Plan trip'
        )}
      </button>
    </form>
  )
}
