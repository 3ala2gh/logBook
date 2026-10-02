import type { Ref } from 'react'
import { ColorDot } from '@/components/ui'
import { DUTY, STOP_META } from '@/constants'
import { formatDuration, formatTime, minutesBetween } from '@/lib/format'
import type { Stop } from '@/types'

interface StopItemProps {
  stop: Stop
  timeZone: string
  selected: boolean
  onSelect: (id: string) => void
  ref?: Ref<HTMLButtonElement>
}

/** One stop: what, where, when, why. When selected, lists the duty statuses inside it. */
export function StopItem({ stop, timeZone, selected, onSelect, ref }: StopItemProps) {
  const meta = STOP_META[stop.type]
  const hasDuration = stop.duration_minutes > 0
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(stop.id)}
      className={`flex w-full gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
        selected ? 'bg-paper ring-1 ring-ink/15' : 'hover:bg-paper/70'
      }`}
    >
      <span
        aria-hidden
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white shadow-sm"
        style={{ backgroundColor: DUTY[meta.status].color }}
      >
        {meta.glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-ink">{stop.label}</span>
          <span className="shrink-0 font-mono text-[13px] text-ink-soft">
            {formatTime(stop.arrive, timeZone)}
            {hasDuration && ` – ${formatTime(stop.depart, timeZone)}`}
          </span>
        </span>
        <span className="block truncate text-sm text-ink-soft">{stop.place ?? 'En route'}</span>
        <span className="mt-0.5 block text-[13px] text-muted">
          {stop.reason}
          {hasDuration && ` · ${formatDuration(stop.duration_minutes)}`} · mile{' '}
          {Math.round(stop.mile).toLocaleString('en-US')}
        </span>
        {selected && stop.activities.length > 1 && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {stop.activities.map((a) => (
              <span
                key={a.start}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-0.5 text-[12px] text-ink-soft"
              >
                <ColorDot color={DUTY[a.status].color} className="size-1.5" />
                {a.activity} · {formatDuration(minutesBetween(a.start, a.end))}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  )
}
