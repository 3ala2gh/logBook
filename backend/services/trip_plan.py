"""Glue between providers and the pure planner: builds the /api/trips/plan/ response."""

from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from zoneinfo import ZoneInfo

from timezonefinder import TimezoneFinder

from planner import config as C
from planner.geometry import Polyline
from planner.hos import MIN_LEG_MILES, build_timeline, round_up_to_slot
from planner.logs import split_days
from planner.models import Activity, DayLog, Leg, Segment, Status

from . import geocoding, routing
from .places import Place

FALLBACK_TIMEZONE = 'America/Chicago'

DEFAULT_LOG_DETAILS = {
    'driver_name': 'Alex Driver',
    'co_driver': '',
    'carrier': 'Demo Freight Lines',
    'main_office': 'Dallas, TX',
    'home_terminal': '',  # defaults to the current location
    'truck_number': 'TRK 101',
    'trailer_number': 'TRL 2048',
    'manifest_number': 'BOL-104233',
    'shipper': 'Acme Distribution',
    'commodity': 'General freight',
}

STOP_PRIORITY = [
    (Activity.RESTART, 'restart', '34-hr restart'),
    (Activity.REST, 'rest', '10-hr rest'),
    (Activity.PICKUP, 'pickup', 'Pickup'),
    (Activity.DROPOFF, 'dropoff', 'Drop-off'),
    (Activity.FUEL, 'fuel', 'Fuel stop'),
    (Activity.BREAK, 'break', '30-min break'),
    (Activity.PRE_TRIP, 'start', 'Trip start'),
    (Activity.POST_TRIP, 'inspection', 'Inspection'),
]


@lru_cache(maxsize=1)
def _tz_finder() -> TimezoneFinder:
    return TimezoneFinder()


def home_timezone(place: Place) -> ZoneInfo:
    name = _tz_finder().timezone_at(lng=place.lng, lat=place.lat) or FALLBACK_TIMEZONE
    return ZoneInfo(name)


def local_start(start_time: datetime | None, tz: ZoneInfo) -> datetime:
    """Trip start as naive home-terminal time, rounded up to a quarter hour."""
    if start_time is None:
        start_time = datetime.now(tz)
    if start_time.tzinfo is not None:
        start_time = start_time.astimezone(tz).replace(tzinfo=None)
    return round_up_to_slot(start_time)


def assumptions() -> list[dict]:
    return [
        {
            'key': 'driver',
            'label': 'Driver',
            'value': 'Property-carrying, 70 hours / 8 days, no adverse conditions',
        },
        {
            'key': 'start_state',
            'label': 'At trip start',
            'value': 'Rested (10+ h off); only cycle hours carry in',
        },
        {'key': 'pickup', 'label': 'Pickup / drop-off', 'value': '1 hour each, On Duty (not driving)'},
        {
            'key': 'fuel',
            'label': 'Fuel',
            'value': f'At most {C.FUEL_INTERVAL_MILES:,} miles apart, {C.FUEL_MINUTES} min On Duty',
        },
        {
            'key': 'inspections',
            'label': 'Inspections',
            'value': f'{C.PRE_TRIP_MINUTES} min pre-trip each shift, {C.POST_TRIP_MINUTES} min post-trip',
        },
        {
            'key': 'break',
            'label': '30-min break',
            'value': 'Off Duty, after 8 h of driving without a 30-min stop',
        },
        {'key': 'rest', 'label': 'Daily rest', 'value': '10 consecutive hours in the Sleeper Berth'},
        {
            'key': 'restart',
            'label': '34-hr restart',
            'value': 'Taken when the 70-hour cycle cannot cover the rest of the trip',
        },
        {
            'key': 'cycle',
            'label': 'Prior cycle hours',
            'value': 'Treated as one total that does not roll off; only a restart clears it',
        },
        {
            'key': 'timezone',
            'label': 'Time zone',
            'value': 'Home terminal = time zone of the current location',
        },
        {'key': 'granularity', 'label': 'Rounding', 'value': 'Quarter hours; driving rounded up'},
    ]


def plan_trip(
    current: Place,
    pickup: Place,
    dropoff: Place,
    cycle_used_hours: float,
    start_time: datetime | None = None,
    log_details: dict | None = None,
) -> dict:
    route = routing.route([current, pickup, dropoff])
    tz = home_timezone(current)
    start = local_start(start_time, tz)

    legs = [Leg(leg.miles, leg.minutes) for leg in route.legs]
    segments = build_timeline(legs, cycle_used_hours, start)
    _locate(segments, route, (current, pickup, dropoff))
    days = split_days(segments, cycle_used_hours)

    def iso(moment: datetime) -> str:
        return moment.replace(tzinfo=tz).isoformat()

    details = {**DEFAULT_LOG_DETAILS, **{k: v for k, v in (log_details or {}).items() if v is not None}}
    if not details['home_terminal']:
        details['home_terminal'] = segments[0].place or current.label

    return {
        'summary': _summary(segments, legs, days, tz, route.provider, iso),
        'route': {
            'provider': route.provider,
            'legs': [
                {
                    'from': name_from,
                    'to': name_to,
                    'miles': round(leg.miles, 1),
                    'minutes': round(leg.minutes),
                    'geometry': [[round(lat, 5), round(lng, 5)] for lat, lng in routing.simplify(leg.points)],
                }
                for leg, (name_from, name_to) in zip(
                    route.legs, [('current', 'pickup'), ('pickup', 'dropoff')], strict=True
                )
            ],
        },
        'locations': {
            'current': current.as_dict(),
            'pickup': pickup.as_dict(),
            'dropoff': dropoff.as_dict(),
        },
        'stops': _stops(segments, iso),
        'segments': [_segment_json(i, seg, iso) for i, seg in enumerate(segments)],
        'daily_logs': [_day_json(day) for day in days],
        'log_details': details,
        'assumptions': assumptions(),
    }


def _locate(segments: list[Segment], route: routing.Route, places: tuple[Place, Place, Place]) -> None:
    """Give every segment the coordinates and "City, ST" of where it starts."""
    current, pickup, dropoff = places
    leg1, leg2 = route.legs
    leg1_miles = leg1.miles if leg1.miles >= MIN_LEG_MILES else 0.0
    total = leg1_miles + (leg2.miles if leg2.miles >= MIN_LEG_MILES else 0.0)
    line1 = Polyline(leg1.points, leg1.miles or None)
    line2 = Polyline(leg2.points, leg2.miles or None)
    eps = 1e-6

    def point_at(mile: float) -> tuple[tuple[float, float], Place | None]:
        if mile <= eps:
            return (current.lat, current.lng), current
        if abs(mile - leg1_miles) <= eps:
            return (pickup.lat, pickup.lng), pickup
        if mile >= total - eps:
            return (dropoff.lat, dropoff.lng), dropoff
        if mile < leg1_miles:
            return line1.point_at(mile), None
        return line2.point_at(mile - leg1_miles), None

    located = [point_at(seg.start_mile) for seg in segments]
    # The user's own three places keep the label they chose; everything else
    # en route is reverse-geocoded to the nearest town.
    labels = geocoding.reverse_many(point for point, place in located if place is None)
    for seg, (point, place) in zip(segments, located, strict=True):
        seg.lat, seg.lng = point
        if place is not None:
            seg.place = place.label
        else:
            seg.place = labels.get(point) or f'{point[0]:.3f}, {point[1]:.3f}'


def _summary(segments, legs, days: list[DayLog], tz: ZoneInfo, provider: str, iso) -> dict:
    driving = [s for s in segments if s.status is Status.DRIVING]
    dropoff = next(s for s in segments if s.activity is Activity.DROPOFF)
    cycle_end = segments[-1].cycle_after / 60

    def count(activity):
        return sum(1 for s in segments if s.activity is activity)

    return {
        'total_miles': round(sum(leg.miles for leg in legs if leg.miles >= MIN_LEG_MILES), 1),
        'driving_minutes': sum(s.minutes for s in driving),
        'total_minutes': int((segments[-1].end - segments[0].start).total_seconds() // 60),
        'start': iso(segments[0].start),
        'arrival': iso(dropoff.start),
        'end': iso(segments[-1].end),
        'days': len(days),
        'cycle_used_start': round(segments[0].cycle_before / 60, 2),
        'cycle_used_end': round(cycle_end, 2),
        'cycle_remaining': round(max(0.0, C.CYCLE_LIMIT / 60 - cycle_end), 2),
        'breaks': count(Activity.BREAK),
        'fuel_stops': count(Activity.FUEL),
        'rests': count(Activity.REST),
        'restarts': count(Activity.RESTART),
        'timezone': tz.key,
        'provider': provider,
    }


def _stops(segments: list[Segment], iso) -> list[dict]:
    """Group consecutive non-driving segments into stops for the map and timeline."""
    groups: list[list[int]] = []
    for i, seg in enumerate(segments):
        if seg.status is Status.DRIVING:
            continue
        if groups and groups[-1][-1] == i - 1:
            groups[-1].append(i)
        else:
            groups.append([i])

    stops = []
    for n, group in enumerate(groups):
        members = [segments[i] for i in group]
        activities = {s.activity for s in members}
        activity, kind, label = next(entry for entry in STOP_PRIORITY if entry[0] in activities)
        main = next(s for s in members if s.activity is activity)
        first, last = members[0], members[-1]
        reason = main.reason
        if kind == 'start':
            reason = 'Pre-trip inspection, then depart'
        stops.append(
            {
                'id': f's{n}',
                'type': kind,
                'label': label,
                'reason': reason,
                'arrive': iso(first.start),
                'depart': iso(last.end),
                'duration_minutes': sum(s.minutes for s in members),
                'mile': round(first.start_mile, 1),
                'lat': first.lat,
                'lng': first.lng,
                'place': first.place,
                'activities': [
                    {
                        'activity': s.activity.value,
                        'status': s.status.value,
                        'start': iso(s.start),
                        'end': iso(s.end),
                    }
                    for s in members
                ],
                'segment_ids': [f'g{i}' for i in group],
            }
        )
    return stops


def _segment_json(i: int, seg: Segment, iso) -> dict:
    return {
        'id': f'g{i}',
        'status': seg.status.value,
        'activity': seg.activity.value,
        'reason': seg.reason,
        'start': iso(seg.start),
        'end': iso(seg.end),
        'minutes': seg.minutes,
        'start_mile': round(seg.start_mile, 1),
        'end_mile': round(seg.end_mile, 1),
        'place': seg.place,
        'lat': seg.lat,
        'lng': seg.lng,
        'cycle_hours_after': round(seg.cycle_after / 60, 2),
    }


def _day_json(day: DayLog) -> dict:
    return {
        'date': day.date.isoformat(),
        'from': day.from_place,
        'to': day.to_place,
        'miles_driving': day.miles_driving,
        'total_mileage': day.miles_driving,
        'segments': [
            {
                'status': p.status.value,
                'activity': p.activity.value,
                'start_minute': p.start_minute,
                'end_minute': p.end_minute,
                'place': p.place,
            }
            for p in day.segments
        ],
        'totals': {status.value: hours for status, hours in day.totals.items()},
        'remarks': [
            {'minute': r.minute, 'status': r.status.value, 'activity': r.activity.value, 'place': r.place}
            for r in day.remarks
        ],
        'recap': {
            'on_duty_today': day.recap.on_duty_today,
            'cycle_total': day.recap.cycle_total,
            'available_tomorrow': day.recap.available_tomorrow,
            'restart_note': day.recap.restart_note,
        },
    }
