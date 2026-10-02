import { useRef } from 'react'
import { DUTY, DUTY_ORDER } from '@/constants'
import { formatDate } from '@/lib/format'
import type { DailyLog } from '@/types'
import { LOG_PANEL_ID, tabId } from '../utils/ids'

interface DayTabsProps {
  logs: DailyLog[]
  activeIndex: number
  onSelect: (index: number) => void
}

/** ARIA tabs, one per day, with a mini bar of that day's duty statuses. Arrow keys move between days. */
export function DayTabs({ logs, activeIndex, onSelect }: DayTabsProps) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  function focusTab(index: number) {
    const next = (index + logs.length) % logs.length
    onSelect(next)
    tabs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label="Log sheet days" className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {logs.map((day, i) => {
        const active = i === activeIndex
        return (
          <button
            key={day.date}
            ref={(el) => {
              tabs.current[i] = el
            }}
            role="tab"
            id={tabId(i)}
            aria-selected={active}
            aria-controls={LOG_PANEL_ID}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') focusTab(i + 1)
              if (e.key === 'ArrowLeft') focusTab(i - 1)
            }}
            className={`shrink-0 rounded-xl border px-3.5 py-2 text-left transition ${
              active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink/30'
            }`}
          >
            <span className="block text-[12px] font-medium opacity-70">Day {i + 1}</span>
            <span className="block text-sm font-semibold">{formatDate(day.date)}</span>
            <span className="mt-1 flex h-1.5 w-28 overflow-hidden rounded-full bg-white/20" aria-hidden>
              {DUTY_ORDER.map((status) => (
                <span
                  key={status}
                  style={{ width: `${(day.totals[status] / 24) * 100}%`, backgroundColor: DUTY[status].color }}
                />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}
