from datetime import datetime, timedelta

from hypothesis import given, settings
from hypothesis import strategies as st
from invariants import check_plan

from planner.hos import build_timeline, candidate_timelines
from planner.models import Leg


@st.composite
def legs(draw, min_miles=0.0):
    miles = draw(st.floats(min_value=min_miles, max_value=3000, allow_nan=False))
    if miles < 0.05:
        return Leg(0.0, 0.0)
    mph = draw(st.floats(min_value=35, max_value=68))
    return Leg(miles, miles / mph * 60)


starts = st.builds(
    lambda day, slot: datetime(2026, 1, 1) + timedelta(days=day, minutes=15 * slot),
    st.integers(0, 365),
    st.integers(0, 95),
)
cycles = st.integers(0, 280).map(lambda q: q / 4)  # 0..70 in quarter hours
any_cycle = st.floats(min_value=0, max_value=70, allow_nan=False)


@settings(max_examples=400, deadline=None)
@given(legs(), legs(min_miles=1), cycles, starts)
def test_every_plan_obeys_hos(leg1, leg2, cycle, start):
    # every candidate the planner considers must be legal, not just the winner
    for segments in candidate_timelines([leg1, leg2], cycle, start):
        check_plan(segments, [leg1, leg2], cycle)


@settings(max_examples=150, deadline=None)
@given(legs(), legs(min_miles=1), any_cycle, starts)
def test_fractional_cycle_hours(leg1, leg2, cycle, start):
    segments = build_timeline([leg1, leg2], cycle, start)
    check_plan(segments, [leg1, leg2], cycle)


@settings(max_examples=100, deadline=None)
@given(st.floats(min_value=0, max_value=70), starts)
def test_tiny_trips(cycle, start):
    route = [Leg(0, 0), Leg(5, 10)]
    segments = build_timeline(route, cycle, start)
    check_plan(segments, route, cycle)
