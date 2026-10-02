import type { Ref } from 'react'
import type { DailyLog, LogDetails } from '@/types'
import { FORM_FONT, SHEET_H, SHEET_W } from '../../constants'
import { CertificationSection } from './CertificationSection'
import { DutyGrid } from './DutyGrid'
import { RecapSection } from './RecapSection'
import { RemarksSection } from './RemarksSection'
import { SheetHeader } from './SheetHeader'
import { ShippingSection } from './ShippingSection'

interface LogSheetProps {
  log: DailyLog
  details: LogDetails
  /** e.g. "America/Los_Angeles (PDT)", printed so the time base is explicit. */
  timeZone?: string
  title?: string
  ref?: Ref<SVGSVGElement>
}

/** One Drivers Daily Log, drawn as SVG after docs/reference/blank-paper-log.png. */
export function LogSheet({ log, details, timeZone, title, ref }: LogSheetProps) {
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title ?? `Driver's daily log for ${log.date}`}
      className="h-auto w-full"
      fontFamily={FORM_FONT}
    >
      <rect width={SHEET_W} height={SHEET_H} fill="#fff" />
      <SheetHeader log={log} details={details} timeZone={timeZone} />
      <DutyGrid log={log} />
      <RemarksSection remarks={log.remarks} />
      <ShippingSection details={details} />
      <RecapSection recap={log.recap} />
      <CertificationSection details={details} />
    </svg>
  )
}
