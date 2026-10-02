import { useEffect, useRef } from 'react'
import { formatDay, minutesBetween } from '@/lib/format'
import type { Stop } from '@/types'
import { DriveConnector } from './DriveConnector'
import { StopItem } from './StopItem'

interface StopTimelineProps {
  stops: Stop[]
  timeZone: string
  selectedId: string | null
  onSelect: (id: string) => void
}

export function StopTimeline({ stops, timeZone, selectedId, onSelect }: StopTimelineProps) {
  const items = useRef(new Map<string, HTMLButtonElement>())

  // Bring the selected stop into view when it was picked on the map.
  useEffect(() => {
    if (selectedId) items.current.get(selectedId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  return (
    <section aria-labelledby="timeline-heading" className="card p-5">
      <h2 id="timeline-heading" className="mb-3 text-lg font-semibold">
        Stops & rests
      </h2>
      <ol>
        {stops.map((stop, i) => {
          const day = formatDay(stop.arrive, timeZone)
          const startsDay = i === 0 || day !== formatDay(stops[i - 1].arrive, timeZone)
          const next = stops[i + 1]
          return (
            <li key={stop.id}>
              {startsDay && <p className="mt-1 mb-2 text-[12px] font-semibold tracking-wide text-muted uppercase">{day}</p>}
              <StopItem
                ref={(el) => {
                  if (el) items.current.set(stop.id, el)
                  else items.current.delete(stop.id)
                }}
                stop={stop}
                timeZone={timeZone}
                selected={stop.id === selectedId}
                onSelect={onSelect}
              />
              {next && <DriveConnector minutes={minutesBetween(stop.depart, next.arrive)} miles={next.mile - stop.mile} />}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
