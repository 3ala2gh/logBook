"""Domain objects → the JSON documented in README.md (mirrored by frontend/src/types)."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from planner.assumptions import ASSUMPTIONS
from planner.geometry import thin
from planner.models import DayLog, Segment, Stop
from services.places import Place
from services.routing import RouteLeg
from services.trip_plan import PlannedTrip

LEG_ENDS = (('current', 'pickup'), ('pickup', 'dropoff'))
COORD_DECIMALS = 5  # ~1 m; keeps the payload small


def present_place(place: Place) -> dict:
    return {'label': place.label, 'lat': place.lat, 'lng': place.lng}


def present_trip(trip: PlannedTrip) -> dict:
    iso = _IsoFormatter(trip.timezone)
    request = trip.request
    return {
        'summary': _summary(trip, iso),
        'route': {
            'provider': trip.route.provider,
            'legs': [_leg(leg, ends) for leg, ends in zip(trip.route.legs, LEG_ENDS, strict=True)],
        },
        'locations': {
            'current': present_place(request.current),
            'pickup': present_place(request.pickup),
            'dropoff': present_place(request.dropoff),
        },
        'stops': [_stop(n, stop, iso) for n, stop in enumerate(trip.stops)],
        'segments': [_segment(i, seg, iso) for i, seg in enumerate(trip.segments)],
        'daily_logs': [_day(day) for day in trip.days],
        'log_details': trip.log_details,
        'assumptions': [{'key': a.key, 'label': a.label, 'value': a.value} for a in ASSUMPTIONS],
    }


class _IsoFormatter:
    """Naive home-terminal datetimes → ISO 8601 with the right UTC offset."""

    def __init__(self, timezone: ZoneInfo):
        self.timezone = timezone

    def __call__(self, moment: datetime) -> str:
        return moment.replace(tzinfo=self.timezone).isoformat()


def _summary(trip: PlannedTrip, iso: _IsoFormatter) -> dict:
    s = trip.summary
    return {
        'total_miles': s.total_miles,
        'driving_minutes': s.driving_minutes,
        'total_minutes': s.total_minutes,
        'start': iso(s.start),
        'arrival': iso(s.arrival),
        'end': iso(s.end),
        'days': len(trip.days),
        'cycle_used_start': s.cycle_used_start,
        'cycle_used_end': s.cycle_used_end,
        'cycle_remaining': s.cycle_remaining,
        'breaks': s.breaks,
        'fuel_stops': s.fuel_stops,
        'rests': s.rests,
        'restarts': s.restarts,
        'timezone': trip.timezone.key,
        'provider': trip.route.provider,
    }


def _leg(leg: RouteLeg, ends: tuple[str, str]) -> dict:
    return {
        'from': ends[0],
        'to': ends[1],
        'miles': round(leg.miles, 1),
        'minutes': round(leg.minutes),
        'geometry': [
            [round(lat, COORD_DECIMALS), round(lng, COORD_DECIMALS)] for lat, lng in thin(leg.points)
        ],
    }


def _segment_id(index: int) -> str:
    return f'g{index}'


def _stop(index: int, stop: Stop, iso: _IsoFormatter) -> dict:
    first = stop.first
    return {
        'id': f's{index}',
        'type': stop.type.value,
        'label': stop.label,
        'reason': stop.reason,
        'arrive': iso(stop.arrive),
        'depart': iso(stop.depart),
        'duration_minutes': stop.minutes,
        'mile': round(first.start_mile, 1),
        'lat': first.lat,
        'lng': first.lng,
        'place': first.place,
        'activities': [
            {
                'activity': seg.activity.value,
                'status': seg.status.value,
                'start': iso(seg.start),
                'end': iso(seg.end),
            }
            for seg in stop.segments
        ],
        'segment_ids': [_segment_id(i) for i in stop.segment_indexes],
    }


def _segment(index: int, seg: Segment, iso: _IsoFormatter) -> dict:
    return {
        'id': _segment_id(index),
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


def _day(day: DayLog) -> dict:
    return {
        'date': day.date.isoformat(),
        'from': day.from_place,
        'to': day.to_place,
        'miles_driving': day.miles_driving,
        'total_mileage': day.miles_driving,  # no non-driving mileage in this planner
        'segments': [
            {
                'status': piece.status.value,
                'activity': piece.activity.value,
                'start_minute': piece.start_minute,
                'end_minute': piece.end_minute,
                'place': piece.place,
            }
            for piece in day.segments
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
