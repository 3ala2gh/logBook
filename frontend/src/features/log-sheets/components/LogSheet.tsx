import { forwardRef, type ReactNode } from 'react'
import { formatHours } from '../../../lib/format'
import type { DailyLog, LogDetails } from '../../../types/api'
import {
  BAND_H,
  BAND_Y,
  GRID_BOTTOM,
  GRID_W,
  GRID_X,
  HOUR_W,
  ROW_H,
  ROW_TOP,
  ROWS,
  SHEET_H,
  SHEET_W,
  TOTALS_X,
  dutyPath,
  groupRemarks,
  hourLabel,
  minuteX,
} from '../geometry'

const FORM = '#111827' // printed form
const INK = '#1d4ed8' // what the driver "wrote"
const FONT = "'IBM Plex Sans', Helvetica, Arial, sans-serif"
const HAND = "'IBM Plex Mono', 'Courier New', monospace"

interface Props {
  log: DailyLog
  details: LogDetails
  /** "America/Los_Angeles": printed next to the date so the time base is explicit */
  timeZone?: string
  title?: string
}

function Lines({ x, y, lines, size = 11, lh = 12.5, anchor = 'start', weight = 400, fill = FORM }: {
  x: number
  y: number
  lines: string[]
  size?: number
  lh?: number
  anchor?: 'start' | 'middle' | 'end'
  weight?: number
  fill?: string
}) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={weight} fill={fill} fontFamily={FONT}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

/** A value written on a form line, with the printed caption underneath. */
function Field({ x1, x2, y, caption, value, captionAnchor = 'middle', size = 14 }: {
  x1: number
  x2: number
  y: number
  caption?: string
  value?: ReactNode
  captionAnchor?: 'start' | 'middle'
  size?: number
}) {
  return (
    <g>
      {value !== undefined && value !== null && value !== '' && (
        <text x={(x1 + x2) / 2} y={y - 5} fontSize={size} textAnchor="middle" fill={INK} fontFamily={HAND}>
          {value}
        </text>
      )}
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={FORM} strokeWidth={1} />
      {caption && (
        <text
          x={captionAnchor === 'middle' ? (x1 + x2) / 2 : x1}
          y={y + 13}
          fontSize={10.5}
          textAnchor={captionAnchor}
          fill={FORM}
          fontFamily={FONT}
        >
          {caption}
        </text>
      )}
    </g>
  )
}

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export const LogSheet = forwardRef<SVGSVGElement, Props>(function LogSheet({ log, details, timeZone, title }, ref) {
  const [year, month, day] = log.date.split('-')
  const totals = ROWS.map((row) => log.totals[row.status] ?? 0)
  const totalSum = totals.reduce((a, b) => a + b, 0)

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title ?? `Driver's daily log for ${log.date}`}
      className="h-auto w-full"
      fontFamily={FONT}
    >
      <rect width={SHEET_W} height={SHEET_H} fill="#fff" />

      {/* ---------- header ---------- */}
      <text x={30} y={52} fontSize={30} fontWeight={700} fill={FORM}>
        Drivers Daily Log
      </text>
      <Lines x={76} y={70} lines={['(24 hours)']} size={11} />

      <Field x1={330} x2={395} y={50} caption="(month)" value={month} />
      <text x={402} y={47} fontSize={20} fill={FORM}>/</text>
      <Field x1={418} x2={483} y={50} caption="(day)" value={day} />
      <text x={490} y={47} fontSize={20} fill={FORM}>/</text>
      <Field x1={506} x2={586} y={50} caption="(year)" value={year} />

      <Lines
        x={612}
        y={34}
        size={10.5}
        lh={14}
        lines={['Original - File at home terminal.', 'Duplicate - Driver retains in his/her possession for 8 days.']}
      />
      {timeZone && <Lines x={612} y={64} size={10.5} lines={[`Time base: ${timeZone} (home terminal)`]} fill={INK} />}

      <text x={58} y={108} fontSize={15} fontWeight={600} fill={FORM}>From:</text>
      <Field x1={108} x2={500} y={110} value={truncate(log.from, 40)} />
      <text x={540} y={108} fontSize={15} fontWeight={600} fill={FORM}>To:</text>
      <Field x1={570} x2={970} y={110} value={truncate(log.to, 40)} />

      {/* mileage boxes */}
      <rect x={58} y={138} width={140} height={48} fill="none" stroke={FORM} strokeWidth={1.5} />
      <rect x={212} y={138} width={140} height={48} fill="none" stroke={FORM} strokeWidth={1.5} />
      <text x={128} y={170} fontSize={18} textAnchor="middle" fill={INK} fontFamily={HAND}>
        {Math.round(log.miles_driving)}
      </text>
      <text x={282} y={170} fontSize={18} textAnchor="middle" fill={INK} fontFamily={HAND}>
        {Math.round(log.total_mileage)}
      </text>
      <Lines x={128} y={200} lines={['Total Miles Driving Today']} size={10.5} anchor="middle" />
      <Lines x={282} y={200} lines={['Total Mileage Today']} size={10.5} anchor="middle" />

      <Field x1={58} x2={352} y={250} value={truncate(`${details.truck_number} / ${details.trailer_number}`, 34)} />
      <Lines
        x={205}
        y={264}
        lines={['Truck/Tractor and Trailer Numbers or', 'License Plate(s)/State (show each unit)']}
        size={10.5}
        anchor="middle"
      />

      <Field x1={420} x2={970} y={176} caption="Name of Carrier or Carriers" value={truncate(details.carrier, 52)} />
      <Field x1={420} x2={970} y={216} caption="Main Office Address" value={truncate(details.main_office, 52)} />
      <Field x1={420} x2={970} y={256} caption="Home Terminal Address" value={truncate(details.home_terminal, 52)} />

      {/* ---------- graph grid ---------- */}
      {/* the black band runs past the grid so both "Mid-night" labels sit on it */}
      <rect x={GRID_X - 24} y={BAND_Y} width={GRID_W + 48} height={BAND_H} fill={FORM} />
      {Array.from({ length: 25 }, (_, h) => {
        const lines = hourLabel(h)
        const x = GRID_X + h * HOUR_W
        return (
          <text key={h} x={x} y={lines.length > 1 ? BAND_Y + 13 : BAND_Y + 20} fontSize={10} fontWeight={600} textAnchor="middle" fill="#fff">
            {lines.map((line, i) => (
              <tspan key={i} x={x} dy={i === 0 ? 0 : 11}>
                {line}
              </tspan>
            ))}
          </text>
        )
      })}
      <Lines x={TOTALS_X} y={BAND_Y + 13} lines={['Total', 'Hours']} size={10} lh={11} anchor="middle" weight={600} />

      {ROWS.map((row, i) => {
        const top = ROW_TOP + i * ROW_H
        return (
          <g key={row.status}>
            <Lines x={28} y={top + (row.label.length > 1 ? 15 : 22)} lines={row.label} size={12} lh={13} weight={600} />
            <rect x={GRID_X} y={top} width={GRID_W} height={ROW_H} fill="none" stroke={FORM} strokeWidth={1.2} />
            {Array.from({ length: 24 }, (_, h) => {
              const x0 = GRID_X + h * HOUR_W
              return (
                <g key={h}>
                  {h > 0 && <line x1={x0} x2={x0} y1={top} y2={top + ROW_H} stroke={FORM} strokeWidth={0.9} />}
                  {[1, 2, 3].map((q) => (
                    <line
                      key={q}
                      x1={x0 + (q * HOUR_W) / 4}
                      x2={x0 + (q * HOUR_W) / 4}
                      y1={top}
                      y2={top + (q === 2 ? 13 : 8)}
                      stroke={FORM}
                      strokeWidth={0.7}
                    />
                  ))}
                </g>
              )
            })}
            <text x={TOTALS_X} y={top + ROW_H / 2 + 5} fontSize={15} textAnchor="middle" fill={INK} fontFamily={HAND}>
              {formatHours(totals[i])}
            </text>
            <line x1={TOTALS_X - 30} x2={TOTALS_X + 30} y1={top + ROW_H - 6} y2={top + ROW_H - 6} stroke={FORM} strokeWidth={1} />
          </g>
        )
      })}
      <text x={TOTALS_X} y={GRID_BOTTOM + 18} fontSize={14} textAnchor="middle" fill={INK} fontFamily={HAND}>
        ={formatHours(Math.round(totalSum * 100) / 100)}
      </text>
      <line x1={TOTALS_X - 30} x2={TOTALS_X + 30} y1={GRID_BOTTOM + 23} y2={GRID_BOTTOM + 23} stroke={FORM} strokeWidth={1} />

      {/* the driver's line */}
      <path
        d={dutyPath(log.segments)}
        fill="none"
        stroke={INK}
        strokeWidth={2.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        data-testid="duty-line"
      />

      {/* ---------- remarks ---------- */}
      <text x={28} y={GRID_BOTTOM + 34} fontSize={15} fontWeight={700} fill={FORM}>
        Remarks
      </text>
      <line x1={40} x2={40} y1={GRID_BOTTOM + 44} y2={742} stroke={FORM} strokeWidth={2} />
      <line x1={40} x2={975} y1={742} y2={742} stroke={FORM} strokeWidth={2} />

      {groupRemarks(log.remarks).map((group) => {
        const x1 = minuteX(group.start)
        const x2 = minuteX(group.end)
        const mid = (x1 + x2) / 2
        const y = GRID_BOTTOM + 16
        return (
          <g key={group.start} data-testid="remark">
            {/* a bracket under the grid spanning the stop */}
            <path
              d={x2 > x1 ? `M ${x1} ${GRID_BOTTOM + 3} V ${y} H ${x2} V ${GRID_BOTTOM + 3}` : `M ${x1} ${GRID_BOTTOM + 3} V ${y + 4}`}
              fill="none"
              stroke={INK}
              strokeWidth={1.4}
            />
            <text
              transform={`translate(${mid - 1} ${y + 8}) rotate(-40)`}
              fontSize={10.5}
              textAnchor="end"
              fill={INK}
              fontFamily={FONT}
            >
              <tspan x={0} dy={0} fontWeight={600}>
                {truncate(group.place, 26)}
              </tspan>
              <tspan x={0} dy={12} fill="#4b5563">
                {truncate(group.activity, 30)}
              </tspan>
            </text>
          </g>
        )
      })}

      {/* shipping documents */}
      <Lines x={55} y={634} lines={['Shipping', 'Documents:']} size={12} lh={13} weight={700} />
      <Field x1={55} x2={300} y={680} value={truncate(details.manifest_number, 26)} />
      <Lines x={55} y={693} lines={['DVL or Manifest No.', 'or']} size={10.5} />
      <Field x1={55} x2={340} y={725} size={12} value={truncate(`${details.shipper} · ${details.commodity}`, 40)} />
      <Lines x={55} y={738} lines={['Shipper & Commodity']} size={10.5} />

      <Lines
        x={SHEET_W / 2 + 40}
        y={762}
        lines={[
          'Enter name of place you reported and where released from work and when and where each change of duty occurred.',
          'Use time standard of home terminal.',
        ]}
        size={11}
        lh={15}
        anchor="middle"
        weight={600}
      />

      {/* ---------- recap ---------- */}
      <Recap log={log} />

      {/* ---------- certification ---------- */}
      <Lines x={30} y={985} lines={['I certify that these entries are true and correct.']} size={10.5} />
      <Field x1={560} x2={970} y={995} caption="Driver's signature in full" value={details.driver_name} />
      <Field x1={30} x2={300} y={1003} caption="Name of co-driver" value={details.co_driver || undefined} captionAnchor="start" />
    </svg>
  )
})

function Recap({ log }: { log: DailyLog }) {
  const y = 812
  const r = log.recap
  const value = (x1: number, x2: number, v: number | null) => (
    <Field x1={x1} x2={x2} y={y} value={v === null ? undefined : formatHours(v)} />
  )
  const col = (x: number, lines: string[]) => <Lines x={x} y={y + 16} lines={lines} size={10} lh={11.5} />
  return (
    <g>
      <Lines x={30} y={y - 8} lines={['Recap:', 'Complete at', 'end of day']} size={10.5} lh={12} weight={700} />
      {value(115, 195, r.on_duty_today)}
      {col(115, ['On duty', 'hours', 'today,', 'Total lines', '3 & 4'])}

      <Lines x={205} y={y - 8} lines={['70 Hour/', '8 Day', 'Drivers']} size={10.5} lh={12} weight={700} />
      {value(280, 360, r.cycle_total)}
      {col(280, ['A. Total', 'hours on', 'duty last 7', 'days', 'including', 'today.'])}
      {value(370, 450, r.available_tomorrow)}
      {col(370, ['B. Total', 'hours', 'available', 'tomorrow', '70 hr.', 'minus A*'])}
      {value(460, 540, r.cycle_total)}
      {col(460, ['C. Total', 'hours on', 'duty last 5', 'days', 'including', 'today.'])}

      <Lines x={555} y={y - 8} lines={['60 Hour/', '7 Day', 'Drivers']} size={10.5} lh={12} weight={700} />
      {value(625, 700, null)}
      {col(625, ['A. Total', 'hours on', 'duty last 8', 'days', 'including', 'today.'])}
      {value(708, 783, null)}
      {col(708, ['B. Total', 'hours', 'available', 'tomorrow', '60 hr.', 'minus A*'])}
      {value(791, 866, null)}
      {col(791, ['C. Total', 'hours on', 'duty last 7', 'days', 'including', 'today.'])}

      <Lines
        x={876}
        y={y - 8}
        lines={['*If you took', '34', 'consecutive', 'hours off', 'duty you', 'have 60/70', 'hours', 'available']}
        size={10}
        lh={11.5}
      />
      {r.restart_note && (
        <text x={280} y={y + 100} fontSize={12} fill={INK} fontFamily={HAND}>
          * {r.restart_note}
        </text>
      )}
      <line x1={30} x2={975} y1={y + 112} y2={y + 112} stroke={FORM} strokeWidth={0.8} />
    </g>
  )
}
