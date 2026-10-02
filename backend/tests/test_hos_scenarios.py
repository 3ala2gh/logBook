from datetime import datetime

import pytest
from invariants import check_plan

from planner.hos import PlanningError, build_timeline, round_up_to_slot
from planner.logs import split_days
from planner.models import Activity, Leg, Status

START = datetime(2026, 10, 5, 8, 0)


def plan(legs, cycle=0.0, start=START):
    segments = build_timeline(legs, cycle, start)
    check_plan(segments, legs, cycle)
    return segments


def activities(segments):
    return [s.activity for s in segments]


def hhmm(segments):
    return [(s.activity.value, f'{s.start:%H:%M}', f'{s.end:%H:%M}') for s in segments]


def test_short_same_day_trip():
    segments = plan([Leg(50, 60), Leg(200, 240)])
    assert hhmm(segments) == [
        ('Pre-trip inspection', '08:00', '08:15'),
        ('Driving', '08:15', '09:15'),
        ('Pickup', '09:15', '10:15'),
        ('Driving', '10:15', '14:15'),
        ('Drop-off', '14:15', '15:15'),
        ('Post-trip inspection', '15:15', '15:30'),
    ]
    days = split_days(segments, 0)
    assert len(days) == 1
    totals = days[0].totals
    assert totals[Status.DRIVING] == 5
    assert totals[Status.ON_DUTY] == 2.5
    assert totals[Status.OFF] == 16.5
    assert totals[Status.SLEEPER] == 0


def test_exactly_one_thirty_minute_break():
    # 2 h to pickup (the 1-hour pickup resets the 8-hour clock), then 9 h loaded.
    segments = plan([Leg(110, 120), Leg(495, 540)])
    breaks = [s for s in segments if s.activity is Activity.BREAK]
    assert len(breaks) == 1
    assert breaks[0].status is Status.OFF and breaks[0].minutes == 30
    assert not any(s.activity in (Activity.REST, Activity.RESTART) for s in segments)
    # the break falls after exactly 8 hours of loaded driving
    after_pickup = segments[activities(segments).index(Activity.PICKUP) + 1 :]
    assert after_pickup[0].activity is Activity.DRIVING and after_pickup[0].minutes == 480
    assert after_pickup[1].activity is Activity.BREAK


def test_multi_day_trip_rests_and_days():
    segments = plan([Leg(400, 420), Leg(1400, 1500)])
    rests = [s for s in segments if s.activity is Activity.REST]
    assert len(rests) >= 2
    assert all(r.status is Status.SLEEPER and r.minutes == 600 for r in rests)
    # every rest is preceded by a post-trip inspection and followed by a pre-trip
    for i, seg in enumerate(segments):
        if seg.activity is Activity.REST:
            assert segments[i - 1].activity is Activity.POST_TRIP
            assert segments[i + 1].activity is Activity.PRE_TRIP
    assert len(split_days(segments, 0)) >= 3


def test_eleven_hour_limit_triggers_rest():
    segments = plan([Leg(0, 0), Leg(700, 780)])  # 13 h of driving
    rest = next(s for s in segments if s.activity is Activity.REST)
    assert rest.reason == '11-hour driving limit reached'
    driving_before = sum(s.minutes for s in segments[: segments.index(rest)] if s.status is Status.DRIVING)
    assert driving_before == 660


def test_fourteen_hour_window_triggers_rest(monkeypatch):
    # A 4-hour pre-trip leaves only 10 hours of the window for driving.
    monkeypatch.setattr('planner.config.PRE_TRIP_MINUTES', 240)
    segments = plan([Leg(0, 0), Leg(700, 780)])
    rest = next(s for s in segments if s.activity is Activity.REST)
    assert rest.reason == '14-hour driving window reached'
    first_shift = segments[: segments.index(rest)]
    assert sum(s.minutes for s in first_shift if s.status is Status.DRIVING) < 660
    last_drive = [s for s in first_shift if s.status is Status.DRIVING][-1]
    assert (last_drive.end - START).total_seconds() / 3600 == 14


def test_fuel_stop_over_1000_miles():
    segments = plan([Leg(100, 110), Leg(1500, 1640)])
    fuels = [s for s in segments if s.activity is Activity.FUEL]
    assert len(fuels) == 1
    assert fuels[0].status is Status.ON_DUTY and fuels[0].minutes == 30
    assert fuels[0].start_mile <= 1000


def test_high_cycle_forces_restart_mid_trip():
    legs = [Leg(300, 330), Leg(2200, 2400)]
    segments = plan(legs, cycle=50)
    restarts = [s for s in segments if s.activity is Activity.RESTART]
    assert len(restarts) == 1
    assert restarts[0].minutes == 34 * 60 and restarts[0].status is Status.OFF
    assert restarts[0].cycle_after == 0
    assert segments.index(restarts[0]) > 0
    days = split_days(segments, 50)
    assert any(d.recap.restart_note and 'completed' in d.recap.restart_note for d in days)


def test_inevitable_restart_replaces_a_ten_hour_rest():
    # LA -> Dallas -> New York with 20 h used: the cycle runs out on day 4.
    segments = plan([Leg(1435, 1380), Leg(1550, 1500)], cycle=20)
    [restart] = [s for s in segments if s.activity is Activity.RESTART]
    assert 'cannot cover the rest of the trip' in restart.reason
    # no pointless 10-hour rest -> short drive -> restart sequence
    i = segments.index(restart)
    previous_rest = max((j for j, s in enumerate(segments[:i]) if s.activity is Activity.REST), default=None)
    driving_between = sum(s.minutes for s in segments[previous_rest:i] if s.status is Status.DRIVING)
    assert driving_between >= 8 * 60


def test_cycle_at_70_starts_with_restart():
    segments = plan([Leg(100, 110), Leg(300, 330)], cycle=70)
    assert segments[0].activity is Activity.RESTART
    assert segments[0].start == START
    assert segments[1].activity is Activity.PRE_TRIP


def test_cycle_nearly_used_starts_with_restart():
    segments = plan([Leg(100, 110), Leg(300, 330)], cycle=69.5)
    assert segments[0].activity is Activity.RESTART


def test_cycle_enough_for_short_trip_does_not_restart():
    # 68 h used leaves 2 h on duty: enough for a trip with only 15 min of driving.
    segments = plan([Leg(0, 0), Leg(10, 15)], cycle=68)
    assert not any(s.activity is Activity.RESTART for s in segments)


def test_current_location_equals_pickup():
    segments = plan([Leg(0, 0), Leg(300, 330)])
    assert activities(segments)[:2] == [Activity.PRE_TRIP, Activity.PICKUP]
    assert segments[1].start_mile == 0


def test_days_split_at_midnight():
    segments = plan([Leg(500, 540), Leg(600, 660)], start=datetime(2026, 10, 5, 20, 0))
    days = split_days(segments, 0)
    assert len(days) >= 2
    assert days[0].segments[0].status is Status.OFF and days[0].segments[0].end_minute == 20 * 60


def test_start_time_must_be_on_quarter_hour():
    with pytest.raises(PlanningError):
        build_timeline([Leg(1, 1), Leg(1, 1)], 0, datetime(2026, 1, 1, 8, 7))


def test_cycle_out_of_range():
    with pytest.raises(PlanningError):
        build_timeline([Leg(1, 1), Leg(1, 1)], 70.5, START)


def test_round_up_to_slot():
    assert round_up_to_slot(datetime(2026, 1, 1, 8, 0)) == datetime(2026, 1, 1, 8, 0)
    assert round_up_to_slot(datetime(2026, 1, 1, 8, 0, 1)) == datetime(2026, 1, 1, 8, 15)
    assert round_up_to_slot(datetime(2026, 1, 1, 23, 50)) == datetime(2026, 1, 2, 0, 0)
