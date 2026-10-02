"""Headline numbers for a planned trip."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from . import config as C
from .models import Activity, Leg, Segment, Status
from .slots import minutes_between


@dataclass(frozen=True)
class TripSummary:
    total_miles: float
    driving_minutes: int
    total_minutes: int
    start: datetime
    arrival: datetime  # arrival at the receiver (start of the drop-off)
    end: datetime
    cycle_used_start: float
    cycle_used_end: float
    cycle_remaining: float
    breaks: int
    fuel_stops: int
    rests: int
    restarts: int


def summarize(segments: Sequence[Segment], legs: Sequence[Leg]) -> TripSummary:
    def count(activity: Activity) -> int:
        return sum(1 for seg in segments if seg.activity is activity)

    first, last = segments[0], segments[-1]
    dropoff = next(seg for seg in segments if seg.activity is Activity.DROPOFF)
    cycle_end = last.cycle_after / 60
    return TripSummary(
        total_miles=round(sum(leg.miles for leg in legs if leg.miles >= C.MIN_LEG_MILES), 1),
        driving_minutes=sum(seg.minutes for seg in segments if seg.status is Status.DRIVING),
        total_minutes=minutes_between(first.start, last.end),
        start=first.start,
        arrival=dropoff.start,
        end=last.end,
        cycle_used_start=round(first.cycle_before / 60, 2),
        cycle_used_end=round(cycle_end, 2),
        cycle_remaining=round(max(0.0, C.CYCLE_LIMIT / 60 - cycle_end), 2),
        breaks=count(Activity.BREAK),
        fuel_stops=count(Activity.FUEL),
        rests=count(Activity.REST),
        restarts=count(Activity.RESTART),
    )
