import { ColorDot } from '@/components/ui'
import { DUTY } from '@/constants'
import type { DutyStatus } from '@/types'
import { ROUTE_STYLE } from '../constants'

const LEGEND_ORDER: DutyStatus[] = ['D', 'ON', 'OFF', 'SB']

function LineSample({ dashed }: { dashed?: boolean }) {
  return (
    <svg width="28" height="6" aria-hidden>
      <line
        x1={dashed ? 2 : 0}
        y1="3"
        x2={dashed ? 26 : 28}
        y2="3"
        stroke={ROUTE_STYLE.loaded.color}
        strokeWidth="4"
        strokeDasharray={dashed ? '1 6' : undefined}
        strokeLinecap={dashed ? 'round' : undefined}
      />
    </svg>
  )
}

export function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-500 rounded-xl bg-white/95 px-3 py-2.5 text-[12px] shadow-md backdrop-blur">
      <div className="flex items-center gap-2">
        <LineSample dashed /> To pickup
        <span className="ml-2" />
        <LineSample /> Loaded
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {LEGEND_ORDER.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <ColorDot color={DUTY[status].color} />
            {DUTY[status].short}
          </span>
        ))}
      </div>
    </div>
  )
}
