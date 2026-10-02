import { useRef, useState } from 'react'
import { ServerStatusPill, ServerWakeBanner, useServerStatus } from '../features/health'
import { LogSheetViewer } from '../features/log-sheets'
import { RouteMap } from '../features/route-map'
import { StopTimeline } from '../features/stop-timeline'
import { TripForm, planTrip, type FieldErrors } from '../features/trip-form'
import { AssumptionsPanel, SummaryCards } from '../features/trip-summary'
import type { ApiError } from '../lib/axios'
import type { PlanRequest, TripPlan } from '../types/api'

const FIELD_NAMES = ['current', 'pickup', 'dropoff', 'cycle_used_hours', 'start_time']

export function PlannerPage() {
  const server = useServerStatus()
  const [plan, setPlan] = useState<TripPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const requestId = useRef(0)

  async function submit(request: PlanRequest) {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    setFieldErrors(undefined)
    try {
      const result = await planTrip(request)
      if (id !== requestId.current) return
      setPlan(result)
      setSelectedStop(null)
    } catch (err) {
      if (id !== requestId.current) return
      const apiError = err as ApiError
      const field = apiError.field?.split('.')[0]
      if (field && FIELD_NAMES.includes(field)) {
        setFieldErrors({ [field]: apiError.message })
      } else {
        setError(apiError.message)
      }
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span>
              <span className="block text-[17px] leading-tight font-semibold">Logbook</span>
              <span className="block text-[12px] leading-tight text-white/60">ELD trip planner · FMCSA Hours of Service</span>
            </span>
          </a>
          <ServerStatusPill status={server} />
        </div>
      </header>
      <ServerWakeBanner status={server} />

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:py-6">
        {/* On phones: form, map, results. On desktop: form and results left, sticky map right. */}
        <div className="grid gap-5 lg:grid-cols-[440px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
          <div className="space-y-5 lg:col-start-1 lg:row-start-1">
            <TripForm loading={loading} serverErrors={fieldErrors} onSubmit={submit} />
            {error && (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-semibold">Couldn't plan this trip</p>
                <p className="mt-0.5">{error}</p>
              </div>
            )}
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="h-[55vh] min-h-80 lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]">
              <RouteMap plan={plan} loading={loading} selectedId={selectedStop} onSelect={setSelectedStop} />
            </div>
          </div>

          <div className="space-y-5 lg:col-start-1 lg:row-start-2">
            {loading && !plan && <ResultsSkeleton />}
            {plan && (
              <div className={`space-y-5 transition ${loading ? 'opacity-50' : ''}`}>
                <SummaryCards summary={plan.summary} />
                <StopTimeline
                  stops={plan.stops}
                  timezone={plan.summary.timezone}
                  selectedId={selectedStop}
                  onSelect={setSelectedStop}
                />
                <AssumptionsPanel assumptions={plan.assumptions} />
              </div>
            )}
          </div>
        </div>

        {plan && (
          <div className="mt-8">
            <LogSheetViewer plan={plan} />
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[1500px] px-4 pb-8 text-xs text-muted sm:px-6">
        Planning aid only, not a certified ELD. Routing © OpenStreetMap contributors via{' '}
        {plan?.summary.provider === 'ors' ? 'openrouteservice' : 'OSRM'}; search by Photon.
      </footer>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="card space-y-3 p-5">
        <div className="skeleton h-5 w-32" />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-[72px] rounded-xl" />
          ))}
        </div>
      </div>
      <div className="card space-y-3 p-5">
        <div className="skeleton h-5 w-28" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
