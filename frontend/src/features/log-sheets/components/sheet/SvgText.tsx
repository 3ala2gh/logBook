import type { ReactNode } from 'react'
import { FORM_COLOR, FORM_FONT, INK_COLOR, INK_FONT } from '../../constants'

interface TextLinesProps {
  x: number
  y: number
  lines: string[]
  size?: number
  lineHeight?: number
  anchor?: 'start' | 'middle' | 'end'
  weight?: number
  fill?: string
}

/** Printed, possibly multi-line, form text. */
export function TextLines({
  x,
  y,
  lines,
  size = 11,
  lineHeight = 12.5,
  anchor = 'start',
  weight = 400,
  fill = FORM_COLOR,
}: TextLinesProps) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={weight} fill={fill} fontFamily={FORM_FONT}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

interface FormFieldProps {
  x1: number
  x2: number
  y: number
  /** Printed caption under the line. */
  caption?: string
  captionAnchor?: 'start' | 'middle'
  /** Handwritten value above the line; nothing is drawn when empty. */
  value?: ReactNode
  size?: number
}

/** A form line with the driver's entry written on it. */
export function FormField({ x1, x2, y, caption, captionAnchor = 'middle', value, size = 14 }: FormFieldProps) {
  const hasValue = value !== undefined && value !== null && value !== ''
  return (
    <g>
      {hasValue && (
        <text x={(x1 + x2) / 2} y={y - 5} fontSize={size} textAnchor="middle" fill={INK_COLOR} fontFamily={INK_FONT}>
          {value}
        </text>
      )}
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={FORM_COLOR} strokeWidth={1} />
      {caption && (
        <text
          x={captionAnchor === 'middle' ? (x1 + x2) / 2 : x1}
          y={y + 13}
          fontSize={10.5}
          textAnchor={captionAnchor}
          fill={FORM_COLOR}
          fontFamily={FORM_FONT}
        >
          {caption}
        </text>
      )}
    </g>
  )
}

/** A handwritten value at an exact point (mileage boxes, totals column). */
export function InkText({ x, y, size = 15, children }: { x: number; y: number; size?: number; children: ReactNode }) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor="middle" fill={INK_COLOR} fontFamily={INK_FONT}>
      {children}
    </text>
  )
}
