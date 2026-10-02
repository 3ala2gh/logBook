import type { DailyLog, DaySegment, DutyStatus, LogDetails, Remark } from '../../../types/api'

/**
 * The completed log from the FMCSA "Interstate Truck Driver's Guide to Hours
 * of Service" (2022), pages 18-19: John Doe, Richmond, VA to Newark, NJ.
 */
const rows: [DutyStatus, string, string, string, string | null][] = [
  ['OFF', '00:00', '06:00', 'Off duty', null],
  ['ON', '06:00', '07:30', 'Load, dispatch, pre-trip', 'Richmond, VA'],
  ['D', '07:30', '09:00', 'Driving', 'Richmond, VA'],
  ['ON', '09:00', '09:30', 'Fuel', 'Fredericksburg, VA'],
  ['D', '09:30', '12:00', 'Driving', 'Fredericksburg, VA'],
  ['OFF', '12:00', '13:00', 'Lunch', 'Baltimore, MD'],
  ['D', '13:00', '15:00', 'Driving', 'Baltimore, MD'],
  ['ON', '15:00', '15:30', 'Delivery', 'Philadelphia, PA'],
  ['D', '15:30', '16:00', 'Driving', 'Philadelphia, PA'],
  ['SB', '16:00', '17:45', 'Sleeper berth', 'Cherry Hill, NJ'],
  ['D', '17:45', '19:00', 'Driving', 'Cherry Hill, NJ'],
  ['ON', '19:00', '21:00', 'Post-trip, paperwork', 'Newark, NJ'],
  ['OFF', '21:00', '24:00', 'Off duty', 'Newark, NJ'],
]

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const segments: DaySegment[] = rows.map(([status, start, end, activity, place]) => ({
  status,
  activity,
  start_minute: minutes(start),
  end_minute: minutes(end),
  place,
}))

const remarks: Remark[] = segments
  .filter((seg, i) => i > 0 && seg.status !== segments[i - 1].status)
  .map((seg) => ({ minute: seg.start_minute, status: seg.status, activity: seg.activity, place: seg.place }))

const totals = segments.reduce(
  (acc, seg) => ({ ...acc, [seg.status]: acc[seg.status] + (seg.end_minute - seg.start_minute) / 60 }),
  { OFF: 0, SB: 0, D: 0, ON: 0 } as Record<DutyStatus, number>,
)

export const JOHN_DOE_LOG: DailyLog = {
  date: '2021-04-09',
  from: 'Richmond, VA',
  to: 'Newark, NJ',
  miles_driving: 350,
  total_mileage: 350,
  segments,
  totals,
  remarks,
  recap: { on_duty_today: 12.25, cycle_total: 12.25, available_tomorrow: 57.75, restart_note: null },
}

export const JOHN_DOE_DETAILS: LogDetails = {
  driver_name: 'John E. Doe',
  co_driver: '',
  carrier: "John Doe's Transportation",
  main_office: 'Washington, D.C.',
  home_terminal: 'Washington, D.C.',
  truck_number: '123',
  trailer_number: '20544',
  manifest_number: '101601',
  shipper: 'Shipper',
  commodity: 'General freight',
}
