// Mirrors the JSON returned by the Django API (backend/services/trip_plan.py).

export type DutyStatus = 'OFF' | 'SB' | 'D' | 'ON'

export type StopType =
  | 'start'
  | 'pickup'
  | 'dropoff'
  | 'fuel'
  | 'break'
  | 'rest'
  | 'restart'
  | 'inspection'

export interface Place {
  label: string
  lat: number
  lng: number
}

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

export interface PlanRequest {
  current: Place
  pickup: Place
  dropoff: Place
  cycle_used_hours: number
  start_time?: string | null
  log_details?: Partial<LogDetails>
}

export interface Summary {
  total_miles: number
  driving_minutes: number
  total_minutes: number
  start: string
  arrival: string
  end: string
  days: number
  cycle_used_start: number
  cycle_used_end: number
  cycle_remaining: number
  breaks: number
  fuel_stops: number
  rests: number
  restarts: number
  timezone: string
  provider: string
}

export interface RouteLeg {
  from: 'current' | 'pickup'
  to: 'pickup' | 'dropoff'
  miles: number
  minutes: number
  geometry: [number, number][]
}

export interface StopActivity {
  activity: string
  status: DutyStatus
  start: string
  end: string
}

export interface Stop {
  id: string
  type: StopType
  label: string
  reason: string | null
  arrive: string
  depart: string
  duration_minutes: number
  mile: number
  lat: number
  lng: number
  place: string | null
  activities: StopActivity[]
  segment_ids: string[]
}

export interface Segment {
  id: string
  status: DutyStatus
  activity: string
  reason: string | null
  start: string
  end: string
  minutes: number
  start_mile: number
  end_mile: number
  place: string | null
  lat: number
  lng: number
  cycle_hours_after: number
}

export interface DaySegment {
  status: DutyStatus
  activity: string
  start_minute: number
  end_minute: number
  place: string | null
}

export interface Remark {
  minute: number
  status: DutyStatus
  activity: string
  place: string | null
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
  recap: {
    on_duty_today: number
    cycle_total: number
    available_tomorrow: number
    restart_note: string | null
  }
}

export interface Assumption {
  key: string
  label: string
  value: string
}

export interface TripPlan {
  summary: Summary
  route: { provider: string; legs: RouteLeg[] }
  locations: { current: Place; pickup: Place; dropoff: Place }
  stops: Stop[]
  segments: Segment[]
  daily_logs: DailyLog[]
  log_details: LogDetails
  assumptions: Assumption[]
}

export interface ApiErrorBody {
  error: { code: string; message: string; field?: string }
}
