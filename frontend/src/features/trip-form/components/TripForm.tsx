import { useState } from 'react'
import { Spinner } from '@/components/ui'
import type { PlanRequest } from '@/types'
import { EXAMPLE_TRIP, LOCATION_FIELDS } from '../constants'
import type { FieldErrors, LocationField, TripFormValues } from '../types'
import { toPlanRequest, validateTrip } from '../utils/validateTrip'
import { CycleHoursField } from './CycleHoursField'
import { DepartureField } from './DepartureField'
import { LocationAutocomplete } from './LocationAutocomplete'
import { LogDetailsFields } from './LogDetailsFields'

interface TripFormProps {
  loading: boolean
  /** Field errors returned by the API; cleared by the parent on each submit. */
  serverErrors?: FieldErrors
  onSubmit: (request: PlanRequest) => void
}

const INITIAL_VALUES: TripFormValues = {
  current: null,
  pickup: null,
  dropoff: null,
  cycleUsedHours: '0',
  startTime: '',
  logDetails: {},
}

const LOCATION_ORDER: LocationField[] = ['current', 'pickup', 'dropoff']

export function TripForm({ loading, serverErrors, onSubmit }: TripFormProps) {
  const [values, setValues] = useState<TripFormValues>(INITIAL_VALUES)
  const [localErrors, setLocalErrors] = useState<FieldErrors>({})
  const errors: FieldErrors = { ...serverErrors, ...localErrors }

  function update<K extends keyof TripFormValues>(key: K, value: TripFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function submit(next: TripFormValues) {
    const found = validateTrip(next)
    setLocalErrors(found)
    if (Object.keys(found).length) {
      // wait for the error state to render, then move focus to the first problem
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    onSubmit(toPlanRequest(next))
  }

  function tryExample() {
    const next: TripFormValues = {
      ...values,
      current: EXAMPLE_TRIP.current,
      pickup: EXAMPLE_TRIP.pickup,
      dropoff: EXAMPLE_TRIP.dropoff,
      cycleUsedHours: String(EXAMPLE_TRIP.cycleUsedHours),
    }
    setValues(next)
    submit(next)
  }

  return (
    <form
      className="card p-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit(values)
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
        {/* dashed rail linking A → P → D */}
        <span aria-hidden className="absolute top-12 bottom-12 left-5.75 border-l-2 border-dashed border-line" />
        {LOCATION_ORDER.map((field) => {
          const config = LOCATION_FIELDS[field]
          return (
            <LocationAutocomplete
              key={field}
              label={config.label}
              placeholder={config.placeholder}
              marker={{ glyph: config.glyph, className: config.markerClass }}
              value={values[field]}
              onChange={(place) => update(field, place)}
              error={errors[field]}
            />
          )
        })}
      </div>

      <div className="mt-5">
        <CycleHoursField
          value={values.cycleUsedHours}
          onChange={(v) => update('cycleUsedHours', v)}
          error={errors.cycle_used_hours}
        />
      </div>
      <div className="mt-4">
        <DepartureField value={values.startTime} onChange={(v) => update('startTime', v)} error={errors.start_time} />
      </div>
      <div className="mt-4">
        <LogDetailsFields value={values.logDetails} onChange={(v) => update('logDetails', v)} />
      </div>

      <button type="submit" className="btn-primary mt-5 w-full py-3" disabled={loading}>
        {loading ? (
          <>
            <Spinner tone="light" />
            Planning route…
          </>
        ) : (
          'Plan trip'
        )}
      </button>
    </form>
  )
}
