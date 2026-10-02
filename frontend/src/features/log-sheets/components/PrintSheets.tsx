import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { DailyLog, LogDetails } from '@/types'
import { LogSheet } from './sheet/LogSheet'

interface PrintSheetsProps {
  logs: DailyLog[]
  details: LogDetails
  timeZone: string
  /** Filled with every sheet's <svg>, for the PDF export. */
  svgs: RefObject<(SVGSVGElement | null)[]>
}

/**
 * Every sheet rendered off-screen at the end of <body>. The print stylesheet
 * (index.css, .print-sheets) shows only these, one per page.
 */
export function PrintSheets({ logs, details, timeZone, svgs }: PrintSheetsProps) {
  return createPortal(
    <div className="print-sheets" aria-hidden>
      {logs.map((day, i) => (
        <div key={day.date} className="print-page">
          <LogSheet
            ref={(el) => {
              svgs.current[i] = el
            }}
            log={day}
            details={details}
            timeZone={timeZone}
          />
        </div>
      ))}
    </div>,
    document.body,
  )
}
