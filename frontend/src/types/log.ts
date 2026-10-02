import type { DutyStatus } from './duty'

/** Header fields printed on every log sheet; all optional in the request. */
export interface LogDetails {
  driver_name: string
  co_driver: string
  carrier: string
  main_office: string
  home_terminal: string
  truck_number: string
  trailer_number: string
  manifest_number: string
  shipper: string
  commodity: string
}

/** A piece of one calendar day, in minutes since midnight (home-terminal time). */
export interface DaySegment {
  status: DutyStatus
  activity: string
  start_minute: number
  end_minute: number
  place: string | null
}

/** A change of duty status, written in the Remarks section. */
export interface Remark {
  minute: number
  status: DutyStatus
  activity: string
  place: string | null
}

/** The 70-hour / 8-day recap at the bottom of the sheet. */
export interface Recap {
  on_duty_today: number
  cycle_total: number
  available_tomorrow: number
  restart_note: string | null
}

export interface DailyLog {
  date: string
  from: string | null
  to: string | null
  miles_driving: number
  total_mileage: number
  segments: DaySegment[]
  totals: Record<DutyStatus, number>
  remarks: Remark[]
  recap: Recap
}
