"""Home-terminal time: the time zone of the current location (FMCSA guide p. 16)."""

from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from zoneinfo import ZoneInfo

from timezonefinder import TimezoneFinder

from planner.slots import round_up_to_slot

from .places import Place

FALLBACK_TIMEZONE = 'America/Chicago'


@lru_cache(maxsize=1)
def _finder() -> TimezoneFinder:
    return TimezoneFinder()  # loads its data once


def home_timezone(place: Place) -> ZoneInfo:
    return ZoneInfo(_finder().timezone_at(lng=place.lng, lat=place.lat) or FALLBACK_TIMEZONE)


def local_start(start_time: datetime | None, tz: ZoneInfo) -> datetime:
    """Trip start as naive home-terminal time, rounded up to a quarter hour.

    No start time means now. A start time without an offset is already home-terminal time.
    """
    if start_time is None:
        start_time = datetime.now(tz)
    if start_time.tzinfo is not None:
        start_time = start_time.astimezone(tz).replace(tzinfo=None)
    return round_up_to_slot(start_time)
