import { useRef, useState } from 'react'
import { timeZoneAbbr } from '@/lib/format'
import type { TripPlan } from '@/types'
import { usePdfExport } from '../hooks/usePdfExport'
import { DaySummary } from './DaySummary'
import { LOG_PANEL_ID, tabId } from '../utils/ids'
import { DayTabs } from './DayTabs'
import { PrintSheets } from './PrintSheets'
import { LogSheet } from './sheet/LogSheet'

export function LogSheetViewer({ plan }: { plan: TripPlan }) {
  const logs = plan.daily_logs
  const [active, setActive] = useState(0)
  const svgs = useRef<(SVGSVGElement | null)[]>([])
  const pdf = usePdfExport()

  const index = Math.min(active, logs.length - 1)
  const tz = plan.summary.timezone
  const timeZone = `${tz} (${timeZoneAbbr(plan.summary.start, tz)})`
  const step = (by: number) => setActive((index + by + logs.length) % logs.length)

  function downloadPdf() {
    const sheets = svgs.current.filter((el): el is SVGSVGElement => el !== null)
    pdf.download(sheets, `daily-logs-${logs[0].date}.pdf`)
  }

  return (
    <section aria-labelledby="logs-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="logs-heading" className="text-xl font-semibold">
            Daily log sheets
          </h2>
          <p className="text-sm text-muted">
            {logs.length} sheet{logs.length > 1 ? 's' : ''}, one per calendar day · times in home-terminal time ({timeZone})
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary px-3.5 py-2 text-sm" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="btn-primary px-3.5 py-2 text-sm" onClick={downloadPdf} disabled={pdf.exporting}>
            {pdf.exporting ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
      {pdf.error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {pdf.error}
        </p>
      )}

      <DayTabs logs={logs} activeIndex={index} onSelect={setActive} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div
          id={LOG_PANEL_ID}
          role="tabpanel"
          aria-labelledby={tabId(index)}
          className="overflow-x-auto rounded-2xl border border-line bg-white p-3 shadow-[0_8px_30px_rgba(15,30,61,0.08)] sm:p-5"
        >
          <div className="min-w-160">
            <LogSheet log={logs[index]} details={plan.log_details} timeZone={timeZone} />
          </div>
        </div>

        <aside className="space-y-4">
          <DaySummary log={logs[index]} dayNumber={index + 1} />
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 py-2 text-sm" onClick={() => step(-1)} disabled={logs.length < 2}>
              ← Previous
            </button>
            <button type="button" className="btn-secondary flex-1 py-2 text-sm" onClick={() => step(1)} disabled={logs.length < 2}>
              Next →
            </button>
          </div>
        </aside>
      </div>

      <PrintSheets logs={logs} details={plan.log_details} timeZone={timeZone} svgs={svgs} />
    </section>
  )
}
