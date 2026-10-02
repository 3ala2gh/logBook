"""Independent re-check of every HOS invariant on a finished plan.

This deliberately does not reuse the planner's bookkeeping: it replays the
timeline from scratch the way an inspector reading the logs would.
"""

from datetime import timedelta

from planner import config as C
from planner.logs import split_days
from planner.models import Activity, Status

MIN_LEG_MILES = C.MIN_LEG_MILES
DAY_MINUTES = C.DAY_MINUTES

EPS = 1e-6


def check_plan(segments, legs, cycle_used_hours):
    assert segments, 'plan is empty'
    _check_slots(segments)
    _check_hos(segments, cycle_used_hours)
    _check_route(segments, legs)
    _check_logs(segments, cycle_used_hours)


def _check_slots(segments):
    for seg in segments:
        assert seg.minutes > 0, seg
        assert seg.minutes % C.SLOT_MINUTES == 0, seg
        assert seg.start.minute % C.SLOT_MINUTES == 0 and seg.start.second == 0, seg
    for prev, cur in zip(segments, segments[1:], strict=False):
        assert prev.end == cur.start, (prev, cur)


def _check_hos(segments, cycle_used_hours):
    off_run = float('inf')  # the driver starts the trip rested
    not_driving_run = float('inf')
    shift_start = None
    shift_drive = 0
    since_break = 0
    cycle = round(cycle_used_hours * 60)
    miles_since_fuel = 0.0

    for seg in segments:
        m = seg.minutes
        if seg.status in (Status.OFF, Status.SLEEPER):
            off_run += m
            if off_run >= C.DAILY_REST_MINUTES:
                shift_start, shift_drive = None, 0
            if off_run >= C.RESTART_MINUTES:
                cycle = 0
        else:
            off_run = 0

        if seg.status is Status.DRIVING:
            not_driving_run = 0
        else:
            not_driving_run += m
            if not_driving_run >= C.BREAK_MINUTES:
                since_break = 0

        if seg.status.is_on_duty:
            if shift_start is None:
                shift_start = seg.start
            cycle += m

        if seg.status is Status.DRIVING:
            shift_drive += m
            since_break += m
            miles_since_fuel += seg.miles
            # 1. at most 11 hours driving between 10-hour rests
            assert shift_drive <= C.MAX_DRIVING_PER_SHIFT, seg
            # 2. no driving after the 14th hour of the shift
            assert seg.end <= shift_start + timedelta(minutes=C.SHIFT_WINDOW), seg
            # 3. at most 8 hours driving without a 30-minute interruption
            assert since_break <= C.MAX_DRIVING_WITHOUT_BREAK, seg
            # 4. never driving beyond 70 hours on duty in the cycle
            assert cycle <= C.CYCLE_LIMIT, seg
            # 5. at most 1,000 miles between fuel stops
            assert miles_since_fuel <= C.FUEL_INTERVAL_MILES + EPS, seg

        if seg.activity is Activity.FUEL:
            miles_since_fuel = 0.0


def _check_route(segments, legs):
    driving = [s for s in segments if s.status is Status.DRIVING]
    route_miles = sum(leg.miles for leg in legs if leg.miles >= MIN_LEG_MILES)
    route_minutes = sum(leg.minutes for leg in legs if leg.miles >= MIN_LEG_MILES)

    # 6. driven miles equal route miles; driving time is at least route time
    assert abs(sum(s.miles for s in driving) - route_miles) < EPS
    assert sum(s.minutes for s in driving) >= route_minutes - EPS

    # 7. pickup and drop-off: once each, 60 minutes on duty, right place and order
    pickups = [i for i, s in enumerate(segments) if s.activity is Activity.PICKUP]
    dropoffs = [i for i, s in enumerate(segments) if s.activity is Activity.DROPOFF]
    assert len(pickups) == 1 and len(dropoffs) == 1
    pickup, dropoff = segments[pickups[0]], segments[dropoffs[0]]
    for stop in (pickup, dropoff):
        assert stop.status is Status.ON_DUTY and stop.minutes == 60
    leg1_miles = legs[0].miles if legs[0].miles >= MIN_LEG_MILES else 0.0
    assert abs(pickup.start_mile - leg1_miles) < EPS
    assert abs(dropoff.start_mile - route_miles) < EPS
    assert all(s.leg_index == 0 for s in segments[: pickups[0]] if s.status is Status.DRIVING)
    assert all(s.leg_index == 1 for s in segments[pickups[0] :] if s.status is Status.DRIVING)
    assert not any(s.status is Status.DRIVING for s in segments[dropoffs[0] :])


def _check_logs(segments, cycle_used_hours):
    # 8. every day is exactly 24 hours, contiguous, on quarter hours
    days = split_days(segments, cycle_used_hours)
    assert days
    for day in days:
        assert abs(sum(day.totals.values()) - 24) < EPS, day.totals
        assert day.segments[0].start_minute == 0 and day.segments[-1].end_minute == DAY_MINUTES
        for prev, cur in zip(day.segments, day.segments[1:], strict=False):
            assert prev.end_minute == cur.start_minute
        assert all(p.start_minute % C.SLOT_MINUTES == 0 for p in day.segments)
        assert 0 <= day.recap.cycle_total <= 70 + 24  # non-driving work past 70 is legal
    for prev, cur in zip(days, days[1:], strict=False):
        assert (cur.date - prev.date).days == 1
