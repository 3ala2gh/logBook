"""Quarter-hour arithmetic. Paper logs are kept in 15-minute increments."""

from __future__ import annotations

import math
from datetime import datetime, timedelta

from .config import SLOT_MINUTES

_EPSILON = 1e-9  # absorb float noise such as 14.999999 slots


def ceil_slot(minutes: float) -> int:
    """Round minutes up to a whole number of slots."""
    return int(math.ceil(minutes / SLOT_MINUTES - _EPSILON)) * SLOT_MINUTES


def floor_slot(minutes: float) -> int:
    """Round minutes down to a whole number of slots."""
    return int(math.floor(minutes / SLOT_MINUTES + _EPSILON)) * SLOT_MINUTES


def is_on_slot(moment: datetime) -> bool:
    return not (moment.second or moment.microsecond or moment.minute % SLOT_MINUTES)


def round_up_to_slot(moment: datetime) -> datetime:
    """Round a datetime up to the next quarter hour (any seconds count as a minute)."""
    if moment.second or moment.microsecond:
        moment = moment.replace(second=0, microsecond=0) + timedelta(minutes=1)
    return moment + timedelta(minutes=(-moment.minute) % SLOT_MINUTES)


def minutes_between(start: datetime, end: datetime) -> int:
    return int((end - start).total_seconds() // 60)
