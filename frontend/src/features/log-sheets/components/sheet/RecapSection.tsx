import { formatHours } from '@/lib/format'
import type { Recap } from '@/types'
import { FORM_COLOR, RECAP_Y } from '../../constants'
import { FormField, InkText, TextLines } from './SvgText'

interface RecapColumn {
  x1: number
  x2: number
  caption: string[]
  /** null leaves the line blank (the 60-hour columns don't apply). */
  value: number | null
}

function Column({ x1, x2, caption, value }: RecapColumn) {
  return (
    <g>
      <FormField x1={x1} x2={x2} y={RECAP_Y} value={value === null ? undefined : formatHours(value)} />
      <TextLines x={x1} y={RECAP_Y + 16} lines={caption} size={10} lineHeight={11.5} />
    </g>
  )
}

function Heading({ x, lines }: { x: number; lines: string[] }) {
  return <TextLines x={x} y={RECAP_Y - 8} lines={lines} size={10.5} lineHeight={12} weight={700} />
}

/**
 * 70 Hour / 8 Day recap. Prior cycle hours are one lump (see README), so the
 * A and C totals are both the cycle total; the 60-hour columns stay blank.
 */
export function RecapSection({ recap }: { recap: Recap }) {
  const columns: RecapColumn[] = [
    { x1: 115, x2: 195, caption: ['On duty', 'hours', 'today,', 'Total lines', '3 & 4'], value: recap.on_duty_today },
    { x1: 280, x2: 360, caption: ['A. Total', 'hours on', 'duty last 7', 'days', 'including', 'today.'], value: recap.cycle_total },
    { x1: 370, x2: 450, caption: ['B. Total', 'hours', 'available', 'tomorrow', '70 hr.', 'minus A*'], value: recap.available_tomorrow },
    { x1: 460, x2: 540, caption: ['C. Total', 'hours on', 'duty last 5', 'days', 'including', 'today.'], value: recap.cycle_total },
    { x1: 625, x2: 700, caption: ['A. Total', 'hours on', 'duty last 8', 'days', 'including', 'today.'], value: null },
    { x1: 708, x2: 783, caption: ['B. Total', 'hours', 'available', 'tomorrow', '60 hr.', 'minus A*'], value: null },
    { x1: 791, x2: 866, caption: ['C. Total', 'hours on', 'duty last 7', 'days', 'including', 'today.'], value: null },
  ]
  return (
    <g>
      <Heading x={30} lines={['Recap:', 'Complete at', 'end of day']} />
      <Heading x={205} lines={['70 Hour/', '8 Day', 'Drivers']} />
      <Heading x={555} lines={['60 Hour/', '7 Day', 'Drivers']} />
      {columns.map((column) => (
        <Column key={column.x1} {...column} />
      ))}
      <TextLines
        x={876}
        y={RECAP_Y - 8}
        lines={['*If you took', '34', 'consecutive', 'hours off', 'duty you', 'have 60/70', 'hours', 'available']}
        size={10}
        lineHeight={11.5}
      />
      {recap.restart_note && (
        <g transform={`translate(0 ${RECAP_Y + 100})`}>
          <InkText x={500} y={0} size={12}>
            * {recap.restart_note}
          </InkText>
        </g>
      )}
      <line x1={30} x2={975} y1={RECAP_Y + 112} y2={RECAP_Y + 112} stroke={FORM_COLOR} strokeWidth={0.8} />
    </g>
  )
}
