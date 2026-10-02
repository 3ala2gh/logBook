import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DUTY, DUTY_ORDER } from '../../../lib/duty'
import { formatHours, timeZoneAbbr } from '../../../lib/format'
import type { DailyLog, TripPlan } from '../../../types/api'
import { exportPdf } from '../exportPdf'
import { LogSheet } from './LogSheet'

function dayLabel(log: DailyLog) {
  const date = new Date(`${log.date}T12:00:00`)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function LogSheetViewer({ plan }: { plan: TripPlan }) {
  const logs = plan.daily_logs
  const [active, setActive] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const printRefs = useRef<(SVGSVGElement | null)[]>([])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.min(active, logs.length - 1)
  const log = logs[index]
  const tz = plan.summary.timezone
  const tzLabel = `${tz} (${timeZoneAbbr(plan.summary.start, tz)})`

  function select(i: number) {
    const next = (i + logs.length) % logs.length
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  async function downloadPdf() {
    setExporting(true)
    setExportError(null)
    try {
      const svgs = printRefs.current.filter((el): el is SVGSVGElement => el !== null)
      await exportPdf(svgs, `daily-logs-${logs[0].date}.pdf`)
    } catch {
      setExportError('Could not create the PDF. Try "Print" and save as PDF instead.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section aria-labelledby="logs-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="logs-heading" className="text-xl font-semibold">
            Daily log sheets
          </h2>
          <p className="text-sm text-muted">
            {logs.length} sheet{logs.length > 1 ? 's' : ''}, one per calendar day · times in home-terminal time ({tzLabel})
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary px-3.5 py-2 text-sm" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="btn-primary px-3.5 py-2 text-sm" onClick={downloadPdf} disabled={exporting}>
            {exporting ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
      {exportError && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {exportError}
        </p>
      )}

      <div role="tablist" aria-label="Log sheet days" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {logs.map((day, i) => (
          <button
            key={day.date}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            role="tab"
            id={`log-tab-${i}`}
            aria-selected={i === index}
            aria-controls="log-panel"
            tabIndex={i === index ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') select(i + 1)
              if (e.key === 'ArrowLeft') select(i - 1)
            }}
            className={`shrink-0 rounded-xl border px-3.5 py-2 text-left transition ${
              i === index ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink/30'
            }`}
          >
            <span className="block text-[12px] font-medium opacity-70">Day {i + 1}</span>
            <span className="block text-sm font-semibold">{dayLabel(day)}</span>
            <span className="mt-1 flex h-1.5 w-28 overflow-hidden rounded-full bg-white/20" aria-hidden>
              {DUTY_ORDER.map((s) => (
                <span key={s} style={{ width: `${(day.totals[s] / 24) * 100}%`, backgroundColor: DUTY[s].color }} />
              ))}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div
          id="log-panel"
          role="tabpanel"
          aria-labelledby={`log-tab-${index}`}
          className="overflow-x-auto rounded-2xl border border-line bg-white p-3 shadow-[0_8px_30px_rgba(15,30,61,0.08)] sm:p-5"
        >
          <div className="min-w-[640px]">
            <LogSheet log={log} details={plan.log_details} timeZone={tzLabel} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold">Day {index + 1} at a glance</h3>
            <dl className="mt-3 space-y-2">
              {DUTY_ORDER.map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <dt className="flex items-center gap-2 text-ink-soft">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: DUTY[s].color }} />
                    {DUTY[s].label}
                  </dt>
                  <dd className="font-mono font-semibold">{formatHours(log.totals[s])} h</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 text-sm">
                <dt className="text-ink-soft">Miles driven</dt>
                <dd className="font-mono font-semibold">{Math.round(log.miles_driving)}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-ink-soft">70-hr total at end of day</dt>
                <dd className="font-mono font-semibold">{formatHours(log.recap.cycle_total)} h</dd>
              </div>
            </dl>
            {log.recap.restart_note && (
              <p className="mt-3 rounded-lg bg-duty-off/10 px-3 py-2 text-[13px] text-ink-soft">{log.recap.restart_note}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 py-2 text-sm" onClick={() => select(index - 1)} disabled={logs.length < 2}>
              ← Previous
            </button>
            <button type="button" className="btn-secondary flex-1 py-2 text-sm" onClick={() => select(index + 1)} disabled={logs.length < 2}>
              Next →
            </button>
          </div>
        </aside>
      </div>

      {/* Every sheet, off-screen: used for printing (one per page) and the PDF export. */}
      {createPortal(
        <div className="print-sheets" aria-hidden>
          {logs.map((day, i) => (
            <div key={day.date} className="print-page">
              <LogSheet
                ref={(el) => {
                  printRefs.current[i] = el
                }}
                log={day}
                details={plan.log_details}
                timeZone={tzLabel}
              />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </section>
  )
}
