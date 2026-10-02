from datetime import datetime

from planner.hos import build_timeline
from planner.models import Activity, Leg, StopType
from planner.stops import group_stops
from planner.summary import summarize

START = datetime(2026, 10, 5, 8, 0)
LEGS = [Leg(400, 420), Leg(1400, 1500)]


def test_stops_cover_every_non_driving_segment_once():
    segments = build_timeline(LEGS, 0, START)
    stops = group_stops(segments)
    covered = [i for stop in stops for i in stop.segment_indexes]
    non_driving = [i for i, seg in enumerate(segments) if seg.activity is not Activity.DRIVING]
    assert covered == non_driving


def test_stop_is_named_after_its_main_activity():
    stops = group_stops(build_timeline(LEGS, 0, START))
    assert stops[0].type is StopType.START
    assert stops[-1].type is StopType.DROPOFF  # drop-off + post-trip
    rest = next(stop for stop in stops if stop.type is StopType.REST)
    # post-trip, 10-hr rest, pre-trip: one stop, timed from arrival to departure
    assert [seg.activity for seg in rest.segments] == [Activity.POST_TRIP, Activity.REST, Activity.PRE_TRIP]
    assert rest.minutes == 15 + 600 + 15
    assert rest.reason == '11-hour driving limit reached'


def test_current_location_at_pickup_is_one_pickup_stop():
    stops = group_stops(build_timeline([Leg(0, 0), Leg(300, 330)], 0, START))
    assert stops[0].type is StopType.PICKUP


def test_summary_numbers():
    segments = build_timeline([Leg(50, 60), Leg(200, 240)], 10, START)
    summary = summarize(segments, [Leg(50, 60), Leg(200, 240)])
    assert summary.total_miles == 250
    assert summary.driving_minutes == 300
    assert summary.total_minutes == 450  # 08:00 → 15:30
    assert summary.arrival == datetime(2026, 10, 5, 14, 15)
    assert summary.cycle_used_start == 10
    assert summary.cycle_used_end == 17.5
    assert summary.cycle_remaining == 52.5
    assert (summary.breaks, summary.fuel_stops, summary.rests, summary.restarts) == (0, 0, 0, 0)
