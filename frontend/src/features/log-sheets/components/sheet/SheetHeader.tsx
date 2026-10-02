import { truncate } from '@/lib/format'
import type { DailyLog, LogDetails } from '@/types'
import { FORM_COLOR, INK_COLOR } from '../../constants'
import { FormField, InkText, TextLines } from './SvgText'

interface SheetHeaderProps {
  log: DailyLog
  details: LogDetails
  timeZone?: string
}

/** Title, date, From/To, mileage boxes, vehicle numbers, carrier and addresses. */
export function SheetHeader({ log, details, timeZone }: SheetHeaderProps) {
  const [year, month, day] = log.date.split('-')
  return (
    <g>
      <text x={30} y={52} fontSize={30} fontWeight={700} fill={FORM_COLOR}>
        Drivers Daily Log
      </text>
      <TextLines x={76} y={70} lines={['(24 hours)']} />

      <FormField x1={330} x2={395} y={50} caption="(month)" value={month} />
      <text x={402} y={47} fontSize={20} fill={FORM_COLOR}>
        /
      </text>
      <FormField x1={418} x2={483} y={50} caption="(day)" value={day} />
      <text x={490} y={47} fontSize={20} fill={FORM_COLOR}>
        /
      </text>
      <FormField x1={506} x2={586} y={50} caption="(year)" value={year} />

      <TextLines
        x={612}
        y={34}
        size={10.5}
        lineHeight={14}
        lines={['Original - File at home terminal.', 'Duplicate - Driver retains in his/her possession for 8 days.']}
      />
      {timeZone && (
        <TextLines x={612} y={64} size={10.5} lines={[`Time base: ${timeZone} (home terminal)`]} fill={INK_COLOR} />
      )}

      <text x={58} y={108} fontSize={15} fontWeight={600} fill={FORM_COLOR}>
        From:
      </text>
      <FormField x1={108} x2={500} y={110} value={truncate(log.from, 40)} />
      <text x={540} y={108} fontSize={15} fontWeight={600} fill={FORM_COLOR}>
        To:
      </text>
      <FormField x1={570} x2={970} y={110} value={truncate(log.to, 40)} />

      <rect x={58} y={138} width={140} height={48} fill="none" stroke={FORM_COLOR} strokeWidth={1.5} />
      <rect x={212} y={138} width={140} height={48} fill="none" stroke={FORM_COLOR} strokeWidth={1.5} />
      <InkText x={128} y={170} size={18}>
        {Math.round(log.miles_driving)}
      </InkText>
      <InkText x={282} y={170} size={18}>
        {Math.round(log.total_mileage)}
      </InkText>
      <TextLines x={128} y={200} lines={['Total Miles Driving Today']} size={10.5} anchor="middle" />
      <TextLines x={282} y={200} lines={['Total Mileage Today']} size={10.5} anchor="middle" />

      <FormField x1={58} x2={352} y={250} value={truncate(`${details.truck_number} / ${details.trailer_number}`, 34)} />
      <TextLines
        x={205}
        y={264}
        lines={['Truck/Tractor and Trailer Numbers or', 'License Plate(s)/State (show each unit)']}
        size={10.5}
        anchor="middle"
      />

      <FormField x1={420} x2={970} y={176} caption="Name of Carrier or Carriers" value={truncate(details.carrier, 52)} />
      <FormField x1={420} x2={970} y={216} caption="Main Office Address" value={truncate(details.main_office, 52)} />
      <FormField x1={420} x2={970} y={256} caption="Home Terminal Address" value={truncate(details.home_terminal, 52)} />
    </g>
  )
}
