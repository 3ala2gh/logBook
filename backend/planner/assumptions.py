"""The planner's assumptions in plain words, for the UI's "Planning assumptions" panel.

Values come from config.py so the text can't drift from what the planner does.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import config as C


@dataclass(frozen=True)
class Assumption:
    key: str
    label: str
    value: str


ASSUMPTIONS: tuple[Assumption, ...] = (
    Assumption('driver', 'Driver', 'Property-carrying, 70 hours / 8 days, no adverse conditions'),
    Assumption('start_state', 'At trip start', 'Rested (10+ h off); only cycle hours carry in'),
    Assumption('pickup', 'Pickup / drop-off', f'{C.PICKUP_MINUTES // 60} hour each, On Duty (not driving)'),
    Assumption(
        'fuel', 'Fuel', f'At most {C.FUEL_INTERVAL_MILES:,} miles apart, {C.FUEL_MINUTES} min On Duty'
    ),
    Assumption(
        'inspections',
        'Inspections',
        f'{C.PRE_TRIP_MINUTES} min pre-trip each shift, {C.POST_TRIP_MINUTES} min post-trip',
    ),
    Assumption('break', '30-min break', 'Off Duty, after 8 h of driving without a 30-min stop'),
    Assumption('rest', 'Daily rest', '10 consecutive hours in the Sleeper Berth'),
    Assumption('restart', '34-hr restart', 'Taken when the 70-hour cycle cannot cover the rest of the trip'),
    Assumption(
        'cycle', 'Prior cycle hours', 'Treated as one total that does not roll off; only a restart clears it'
    ),
    Assumption('timezone', 'Time zone', 'Home terminal = time zone of the current location'),
    Assumption('granularity', 'Rounding', 'Quarter hours; driving rounded up'),
)
