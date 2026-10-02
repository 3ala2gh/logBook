from __future__ import annotations

from dataclasses import dataclass, field
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
    notes: list[str] = field(default_factory=list)
