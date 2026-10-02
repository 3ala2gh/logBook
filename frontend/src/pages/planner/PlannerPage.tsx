import { useState } from 'react'
import { AppHeader } from '@/components/layout'
import { ErrorAlert } from '@/components/ui'
import { ServerStatusPill, ServerWakeBanner, useServerStatus } from '@/features/health'
import { LogSheetViewer } from '@/features/log-sheets'
import { RouteMap } from '@/features/route-map'
import { StopTimeline } from '@/features/stop-timeline'
import { TripForm, useTripPlanner } from '@/features/trip-form'
import { AssumptionsPanel, SummaryCards } from '@/features/trip-summary'
import type { PlanRequest } from '@/types'
import { ResultsSkeleton } from './ResultsSkeleton'

export function PlannerPage() {
  const server = useServerStatus()
  const { plan, loading, error, fieldErrors, submit } = useTripPlanner()
  const [selectedStop, setSelectedStop] = useState<string | null>(null)

  function planTrip(request: PlanRequest) {
    setSelectedStop(null)
    submit(request)
  }

  return (
    <div className="min-h-screen">
      <AppHeader tagline="ELD trip planner · FMCSA Hours of Service" actions={<ServerStatusPill status={server} />} />
      <ServerWakeBanner status={server} />

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:py-6">
        {/* Phones: form, map, results. Desktop: form and results on the left, sticky map on the right. */}
        <div className="grid gap-5 lg:grid-cols-[440px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
          <div className="space-y-5 lg:col-start-1 lg:row-start-1">
            <TripForm loading={loading} serverErrors={fieldErrors} onSubmit={planTrip} />
            {error && <ErrorAlert title="Couldn't plan this trip" message={error} />}
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
                  timeZone={plan.summary.timezone}
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
