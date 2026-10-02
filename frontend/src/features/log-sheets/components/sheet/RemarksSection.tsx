import { truncate } from '@/lib/format'
import type { Remark } from '@/types'
import { FORM_COLOR, FORM_FONT, GRID_BOTTOM, INK_COLOR, MUTED_INK, REMARKS_BOTTOM } from '../../constants'
import { minuteX } from '../../utils/geometry'
import { groupRemarks } from '../../utils/remarks'

const BRACKET_Y = GRID_BOTTOM + 16

/** "Remarks": a bracket under each stop with the place and activity written at an angle (guide pp. 18–19). */
export function RemarksSection({ remarks }: { remarks: Remark[] }) {
  return (
    <g>
      <text x={28} y={GRID_BOTTOM + 34} fontSize={15} fontWeight={700} fill={FORM_COLOR}>
        Remarks
      </text>
      <line x1={40} x2={40} y1={GRID_BOTTOM + 44} y2={REMARKS_BOTTOM} stroke={FORM_COLOR} strokeWidth={2} />
      <line x1={40} x2={975} y1={REMARKS_BOTTOM} y2={REMARKS_BOTTOM} stroke={FORM_COLOR} strokeWidth={2} />

      {groupRemarks(remarks).map((group) => {
        const x1 = minuteX(group.start)
        const x2 = minuteX(group.end)
        const bracket =
          x2 > x1
            ? `M ${x1} ${GRID_BOTTOM + 3} V ${BRACKET_Y} H ${x2} V ${GRID_BOTTOM + 3}`
            : `M ${x1} ${GRID_BOTTOM + 3} V ${BRACKET_Y + 4}`
        return (
          <g key={group.start} data-testid="remark">
            <path d={bracket} fill="none" stroke={INK_COLOR} strokeWidth={1.4} />
            <text
              transform={`translate(${(x1 + x2) / 2 - 1} ${BRACKET_Y + 8}) rotate(-40)`}
              fontSize={10.5}
              textAnchor="end"
              fill={INK_COLOR}
              fontFamily={FORM_FONT}
            >
              <tspan x={0} dy={0} fontWeight={600}>
                {truncate(group.place, 26)}
              </tspan>
              <tspan x={0} dy={12} fill={MUTED_INK}>
                {truncate(group.activity, 30)}
              </tspan>
            </text>
          </g>
        )
      })}
    </g>
  )
}
