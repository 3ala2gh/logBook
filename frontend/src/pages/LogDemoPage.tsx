import { useRef } from 'react'
import { JOHN_DOE_DETAILS, JOHN_DOE_LOG, LogSheet, exportPdf } from '../features/log-sheets'
import { DUTY, DUTY_ORDER } from '../lib/duty'
import { formatHours } from '../lib/format'

const EXPECTED = { OFF: 10, SB: 1.75, D: 7.75, ON: 4.5 }

/** The FMCSA guide's completed example (pp. 18-19), drawn by our renderer for comparison. */
export function LogDemoPage() {
  const sheet = useRef<SVGSVGElement>(null)
  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span className="text-[17px] font-semibold">Logbook</span>
          </a>
          <a href="/" className="text-sm text-white/80 underline-offset-4 hover:underline">
            ← Back to the planner
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold">Log renderer check: the FMCSA example</h1>
        <p className="mt-1 max-w-3xl text-muted">
          John Doe's day from the FMCSA <em>Interstate Truck Driver's Guide to Hours of Service</em> (2022), pages 18–19,
          drawn by the same component that renders planned trips. Compare it with the guide side by side.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-x-auto rounded-2xl border border-line bg-white p-4 shadow-[0_8px_30px_rgba(15,30,61,0.08)]">
            <div className="min-w-[640px]">
              <LogSheet ref={sheet} log={JOHN_DOE_LOG} details={JOHN_DOE_DETAILS} title="FMCSA example log, John Doe, 04/09/2021" />
            </div>
          </div>
          <aside className="card h-fit p-4">
            <h2 className="font-semibold">Totals vs. the guide</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-1 font-medium">Status</th>
                  <th className="pb-1 text-right font-medium">Guide</th>
                  <th className="pb-1 text-right font-medium">Drawn</th>
                </tr>
              </thead>
              <tbody>
                {DUTY_ORDER.map((s) => (
                  <tr key={s} className="border-t border-line">
                    <td className="py-1.5">{DUTY[s].label}</td>
                    <td className="py-1.5 text-right font-mono">{formatHours(EXPECTED[s])}</td>
                    <td className="py-1.5 text-right font-mono">{formatHours(JOHN_DOE_LOG.totals[s])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="btn-secondary mt-4 w-full py-2 text-sm"
              onClick={() => sheet.current && exportPdf([sheet.current], 'fmcsa-example-log.pdf')}
            >
              Download as PDF
            </button>
          </aside>
        </div>
      </main>
    </div>
  )
}
