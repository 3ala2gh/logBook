import { useEffect, useRef } from 'react'
import { DUTY, STOP_META } from '../../../lib/duty'
import { formatDay, formatDuration, formatMiles, formatTime } from '../../../lib/format'
import type { Stop } from '../../../types/api'

interface Props {
  stops: Stop[]
  timezone: string
  selectedId: string | null
  onSelect: (id: string) => void
}

const minutesBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 60000)

export function StopTimeline({ stops, timezone, selectedId, onSelect }: Props) {
  const refs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    if (selectedId) refs.current.get(selectedId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  return (
    <section aria-labelledby="timeline-heading" className="card p-5">
      <h2 id="timeline-heading" className="mb-3 text-lg font-semibold">
        Stops & rests
      </h2>
      <ol className="relative">
        {stops.map((stop, i) => {
          const meta = STOP_META[stop.type]
          const duty = DUTY[meta.status]
          const next = stops[i + 1]
          const selected = stop.id === selectedId
          const newDay = i === 0 || formatDay(stop.arrive, timezone) !== formatDay(stops[i - 1].arrive, timezone)
          return (
            <li key={stop.id}>
              {newDay && (
                <p className="mt-1 mb-2 text-[12px] font-semibold tracking-wide text-muted uppercase">
                  {formatDay(stop.arrive, timezone)}
                </p>
              )}
              <button
                ref={(el) => {
                  if (el) refs.current.set(stop.id, el)
                  else refs.current.delete(stop.id)
                }}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(stop.id)}
                className={`group flex w-full gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                  selected ? 'bg-paper ring-1 ring-ink/15' : 'hover:bg-paper/70'
                }`}
              >
                <span
                  aria-hidden
                  className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: duty.color }}
                >
                  {meta.glyph}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink">{stop.label}</span>
                    <span className="shrink-0 font-mono text-[13px] text-ink-soft">
                      {formatTime(stop.arrive, timezone)}
                      {stop.duration_minutes > 0 && ` – ${formatTime(stop.depart, timezone)}`}
                    </span>
                  </span>
                  <span className="block truncate text-sm text-ink-soft">{stop.place ?? 'En route'}</span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {stop.reason}
                    {stop.duration_minutes > 0 && ` · ${formatDuration(stop.duration_minutes)}`} · mile{' '}
                    {Math.round(stop.mile).toLocaleString('en-US')}
                  </span>
                  {selected && stop.activities.length > 1 && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {stop.activities.map((a) => (
                        <span
                          key={a.start}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-0.5 text-[12px] text-ink-soft"
                        >
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: DUTY[a.status].color }} />
                          {a.activity} · {formatDuration(minutesBetween(a.start, a.end))}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
              {next && (
                <div className="flex items-center gap-3 py-1 pl-[25px] text-[13px] text-muted">
                  <span aria-hidden className="h-7 border-l-2 border-duty-d/60" />
                  <span>
                    <span className="font-medium text-duty-d">Drive</span>{' '}
                    {formatDuration(minutesBetween(stop.depart, next.arrive))} · {formatMiles(next.mile - stop.mile)}
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
