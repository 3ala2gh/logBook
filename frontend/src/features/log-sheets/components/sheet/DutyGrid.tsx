import { formatHours } from '@/lib/format'
import type { DailyLog } from '@/types'
import {
  BAND_H,
  BAND_OVERHANG,
  BAND_Y,
  FORM_COLOR,
  GRID_BOTTOM,
  GRID_ROWS,
  GRID_W,
  GRID_X,
  HOUR_W,
  INK_COLOR,
  ROW_H,
  ROW_TOP,
  TOTALS_X,
} from '../../constants'
import { dutyPath, hourLabel } from '../../utils/geometry'
import { InkText, TextLines } from './SvgText'

const QUARTERS = [1, 2, 3]
const HOURS = Array.from({ length: 24 }, (_, h) => h)

function HourBand() {
  return (
    <g>
      <rect x={GRID_X - BAND_OVERHANG} y={BAND_Y} width={GRID_W + BAND_OVERHANG * 2} height={BAND_H} fill={FORM_COLOR} />
      {[...HOURS, 24].map((h) => {
        const lines = hourLabel(h)
        const x = GRID_X + h * HOUR_W
        return (
          <text
            key={h}
            x={x}
            y={lines.length > 1 ? BAND_Y + 13 : BAND_Y + 20}
            fontSize={10}
            fontWeight={600}
            textAnchor="middle"
            fill="#fff"
          >
            {lines.map((line, i) => (
              <tspan key={i} x={x} dy={i === 0 ? 0 : 11}>
                {line}
              </tspan>
            ))}
          </text>
        )
      })}
      <TextLines x={TOTALS_X} y={BAND_Y + 13} lines={['Total', 'Hours']} size={10} lineHeight={11} anchor="middle" weight={600} />
    </g>
  )
}

/** Hour lines plus quarter-hour ticks hanging from the top of a row (the half hour is longer). */
function RowTicks({ top }: { top: number }) {
  return HOURS.map((h) => {
    const x0 = GRID_X + h * HOUR_W
    return (
      <g key={h}>
        {h > 0 && <line x1={x0} x2={x0} y1={top} y2={top + ROW_H} stroke={FORM_COLOR} strokeWidth={0.9} />}
        {QUARTERS.map((q) => {
          const x = x0 + (q * HOUR_W) / 4
          return <line key={q} x1={x} x2={x} y1={top} y2={top + (q === 2 ? 13 : 8)} stroke={FORM_COLOR} strokeWidth={0.7} />
        })}
      </g>
    )
  })
}

function TotalLine({ y }: { y: number }) {
  return <line x1={TOTALS_X - 30} x2={TOTALS_X + 30} y1={y} y2={y} stroke={FORM_COLOR} strokeWidth={1} />
}

/** The 24-hour graph grid with the driver's line and the Total Hours column. */
export function DutyGrid({ log }: { log: DailyLog }) {
  const sum = GRID_ROWS.reduce((total, row) => total + (log.totals[row.status] ?? 0), 0)
  return (
    <g>
      <HourBand />
      {GRID_ROWS.map((row, i) => {
        const top = ROW_TOP + i * ROW_H
        return (
          <g key={row.status}>
            <TextLines x={28} y={top + (row.label.length > 1 ? 15 : 22)} lines={row.label} size={12} lineHeight={13} weight={600} />
            <rect x={GRID_X} y={top} width={GRID_W} height={ROW_H} fill="none" stroke={FORM_COLOR} strokeWidth={1.2} />
            <RowTicks top={top} />
            <InkText x={TOTALS_X} y={top + ROW_H / 2 + 5}>
              {formatHours(log.totals[row.status] ?? 0)}
            </InkText>
            <TotalLine y={top + ROW_H - 6} />
          </g>
        )
      })}
      <InkText x={TOTALS_X} y={GRID_BOTTOM + 18} size={14}>
        ={formatHours(Math.round(sum * 100) / 100)}
      </InkText>
      <TotalLine y={GRID_BOTTOM + 23} />

      <path
        d={dutyPath(log.segments)}
        fill="none"
        stroke={INK_COLOR}
        strokeWidth={2.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        data-testid="duty-line"
      />
    </g>
  )
}
