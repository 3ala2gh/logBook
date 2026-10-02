import type { Assumption } from '../../../types/api'

export function AssumptionsPanel({ assumptions }: { assumptions: Assumption[] }) {
  return (
    <details className="group card">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 select-none">
        <span className="font-semibold">Planning assumptions</span>
        <span aria-hidden className="text-muted transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <dl className="grid gap-x-4 gap-y-2.5 px-5 pb-5 text-sm sm:grid-cols-[150px_1fr]">
        {assumptions.map((a) => (
          <div key={a.key} className="contents">
            <dt className="font-medium text-ink-soft">{a.label}</dt>
            <dd className="text-muted">{a.value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line px-5 py-3 text-xs text-muted">
        Rules from the FMCSA Interstate Truck Driver's Guide to Hours of Service (2022): 11-hour driving limit, 14-hour
        window, 30-minute break after 8 hours of driving, 70 hours / 8 days, 34-hour restart.
      </p>
    </details>
  )
}
