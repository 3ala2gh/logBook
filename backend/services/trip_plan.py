"""Plan a trip end to end: route it, apply the HOS planner, place every stop on the map."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from planner.hos import build_timeline
from planner.logs import split_days
from planner.models import DayLog, Leg, Segment, Stop
from planner.stops import group_stops
from planner.summary import TripSummary, summarize

from . import routing
from .locating import RouteLocator, locate_segments
from .log_details import resolve_log_details
from .places import Place
from .timezones import home_timezone, local_start


@dataclass(frozen=True)
class TripRequest:
    current: Place
    pickup: Place
    dropoff: Place
    cycle_used_hours: float
    start_time: datetime | None = None
    log_details: dict[str, str] | None = None


@dataclass(frozen=True)
class PlannedTrip:
    request: TripRequest
    route: routing.Route
    timezone: ZoneInfo
    segments: list[Segment]
    stops: list[Stop]
    days: list[DayLog]
    summary: TripSummary
    log_details: dict[str, str]


def plan_trip(trip: TripRequest) -> PlannedTrip:
    """Raises routing.Unroutable, http.ProviderError or hos.PlanningError."""
    route = routing.route([trip.current, trip.pickup, trip.dropoff])
    timezone = home_timezone(trip.current)

    legs = [Leg(leg.miles, leg.minutes) for leg in route.legs]
    segments = build_timeline(legs, trip.cycle_used_hours, local_start(trip.start_time, timezone))
    locate_segments(segments, RouteLocator(route, trip.current, trip.pickup, trip.dropoff))

    return PlannedTrip(
        request=trip,
        route=route,
        timezone=timezone,
        segments=segments,
        stops=group_stops(segments),
        days=split_days(segments, trip.cycle_used_hours),
        summary=summarize(segments, legs),
        log_details=resolve_log_details(trip.log_details, home_terminal=trip.current.label),
    )
