import type { DutyStatus } from './duty'
import type { DailyLog, LogDetails } from './log'
import type { Place } from './place'

// Mirrors POST /api/trips/plan/ (backend/services/trip_plan.py).

export interface PlanRequest {
  current: Place
  pickup: Place
  dropoff: Place
  cycle_used_hours: number
  start_time?: string | null
  log_details?: Partial<LogDetails>
}

export interface TripSummary {
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

export type StopType = 'start' | 'pickup' | 'dropoff' | 'fuel' | 'break' | 'rest' | 'restart' | 'inspection'

export interface StopActivity {
  activity: string
  status: DutyStatus
  start: string
  end: string
}

/** Consecutive non-driving segments at one place, shown on the map and timeline. */
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

export interface TimelineSegment {
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

export interface Assumption {
  key: string
  label: string
  value: string
}

export interface TripPlan {
  summary: TripSummary
  route: { provider: string; legs: RouteLeg[] }
  locations: { current: Place; pickup: Place; dropoff: Place }
  stops: Stop[]
  segments: TimelineSegment[]
  daily_logs: DailyLog[]
  log_details: LogDetails
  assumptions: Assumption[]
}
