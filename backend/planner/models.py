from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from enum import StrEnum


class Status(StrEnum):
    """The four duty statuses, in the order of the rows on the log grid."""

    OFF = 'OFF'
    SLEEPER = 'SB'
    DRIVING = 'D'
    ON_DUTY = 'ON'

    @property
    def is_on_duty(self) -> bool:
        return self in (Status.DRIVING, Status.ON_DUTY)


class Activity(StrEnum):
    OFF_DUTY = 'Off duty'
    DRIVING = 'Driving'
    PRE_TRIP = 'Pre-trip inspection'
    POST_TRIP = 'Post-trip inspection'
    PICKUP = 'Pickup'
    DROPOFF = 'Drop-off'
    FUEL = 'Fuel'
    BREAK = '30-min break'
    REST = '10-hr rest'
    RESTART = '34-hr restart'


class StopType(StrEnum):
    START = 'start'
    PICKUP = 'pickup'
    DROPOFF = 'dropoff'
    FUEL = 'fuel'
    BREAK = 'break'
    REST = 'rest'
    RESTART = 'restart'
    INSPECTION = 'inspection'


@dataclass(frozen=True)
class Leg:
    """One routed leg. `minutes` is the provider's driving time (unrounded)."""

    miles: float
    minutes: float


@dataclass
class Segment:
    status: Status
    activity: Activity
    start: datetime
    end: datetime
    start_mile: float
    end_mile: float
    reason: str | None = None
    leg_index: int | None = None  # driving segments: which leg they belong to
    cycle_before: int = 0  # on-duty minutes counted in the 70-hour cycle
    cycle_after: int = 0
    place: str | None = None
    lat: float | None = None
    lng: float | None = None

    @property
    def minutes(self) -> int:
        return int((self.end - self.start).total_seconds() // 60)

    @property
    def miles(self) -> float:
        return self.end_mile - self.start_mile


@dataclass
class Stop:
    """Consecutive non-driving segments at one place, e.g. post-trip + 10-hr rest + pre-trip."""

    type: StopType
    label: str
    reason: str | None
    segments: list[Segment]
    segment_indexes: list[int]

    @property
    def first(self) -> Segment:
        return self.segments[0]

    @property
    def arrive(self) -> datetime:
        return self.segments[0].start

    @property
    def depart(self) -> datetime:
        return self.segments[-1].end

    @property
    def minutes(self) -> int:
        return sum(seg.minutes for seg in self.segments)


@dataclass
class DaySegment:
    status: Status
    activity: Activity
    start_minute: int
    end_minute: int
    miles: float
    place: str | None = None


@dataclass
class Remark:
    minute: int
    status: Status
    activity: Activity
    place: str | None


@dataclass
class Recap:
    on_duty_today: float
    cycle_total: float
    available_tomorrow: float
    restart_note: str | None = None


@dataclass
class DayLog:
    date: date
    segments: list[DaySegment]
    totals: dict[Status, float]
    remarks: list[Remark]
    miles_driving: float
    from_place: str | None
    to_place: str | None
    recap: Recap
