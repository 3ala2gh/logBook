"""Hours of Service trip planner.

Pure Python: takes routed legs and the driver's cycle hours, returns a
timeline of duty-status segments that obeys the property-carrying HOS rules.
No Django, no network.

The planner walks the trip (drive to pickup, 1 h pickup, drive to drop-off,
1 h drop-off). For each driving step it drives the largest chunk every limit
allows; when a limit binds it inserts what that limit requires (30-minute
break, fuel, 10-hour rest or 34-hour restart) and carries on.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import astuple, dataclass
from datetime import datetime, timedelta

from . import config as C
from .models import Activity, Leg, Segment, Status
from .slots import ceil_slot, floor_slot, is_on_slot, minutes_between


class PlanningError(ValueError):
    """The input cannot be planned (cycle hours, start time or legs out of range)."""


# Why each stop happens; shown on the stop timeline and in map popups.
REASON_SHIFT_START = 'Start of shift'
REASON_SHIFT_END = 'End of shift'
REASON_TRIP_END = 'End of trip'
REASON_PICKUP = 'Loading at the shipper (1 hour)'
REASON_DROPOFF = 'Unloading at the receiver (1 hour)'
REASON_FUEL = 'Fuel at least every 1,000 miles'
REASON_BREAK = '8 hours of driving since last break'
REASON_BREAK_SKIPPED = 'Shift nearly over: resting for 10 hours instead of a 30-minute break'
REASON_DRIVING_LIMIT = '11-hour driving limit reached'
REASON_WINDOW_LIMIT = '14-hour driving window reached'
REASON_CYCLE_LIMIT = '70-hour/8-day limit reached'


def build_timeline(legs: Sequence[Leg], cycle_used_hours: float, start: datetime) -> list[Segment]:
    """Plan the trip. `legs` is [current→pickup, pickup→dropoff]; `start` must be on a quarter hour.

    When the 70-hour cycle cannot cover the whole trip, a 34-hour restart is
    unavoidable. It can replace any of the 10-hour rests taken from then on,
    or be left until the cycle actually runs out. Each option is planned and
    the one that finishes earliest wins (ties go to the later restart).
    """
    return min(candidate_timelines(legs, cycle_used_hours, start), key=lambda timeline: timeline[-1].end)


def candidate_timelines(legs: Sequence[Leg], cycle_used_hours: float, start: datetime) -> list[list[Segment]]:
    """The baseline plan first, then one plan per possible restart placement, latest first."""
    _validate(legs, cycle_used_hours, start)
    baseline = _Planner(legs, cycle_used_hours, start)
    timelines = [baseline.run()]
    for rest_index in reversed(range(baseline.unavoidable_rests)):
        timelines.append(_Planner(legs, cycle_used_hours, start, restart_at_rest=rest_index).run())
    return timelines


def _validate(legs: Sequence[Leg], cycle_used_hours: float, start: datetime) -> None:
    if len(legs) != 2:
        raise PlanningError('Expected two legs: current → pickup and pickup → drop-off.')
    if not 0 <= cycle_used_hours <= C.CYCLE_LIMIT / 60:
        raise PlanningError('Cycle hours used must be between 0 and 70.')
    if not is_on_slot(start):
        raise PlanningError('Start time must be on a quarter hour.')
    if any(leg.miles < 0 or leg.minutes < 0 for leg in legs):
        raise PlanningError('Leg distance and duration must not be negative.')


@dataclass(frozen=True)
class Limits:
    """Minutes of driving each rule still allows right now."""

    driving: int  # 11-hour driving limit
    window: int  # 14-hour window
    since_break: int  # 8 hours without a 30-minute break
    cycle: int  # 70 hours / 8 days
    fuel: int  # 1,000 miles between fuel stops

    def smallest(self) -> int:
        return min(astuple(self))


class _Planner:
    """One simulation of the trip. Mutable; use once."""

    def __init__(
        self,
        legs: Sequence[Leg],
        cycle_used_hours: float,
        start: datetime,
        restart_at_rest: int | None = None,
    ):
        self.legs = list(legs)
        # Driving time per leg on quarter hours, rounded up so driving is never under-planned.
        self.remaining = [ceil_slot(leg.minutes) if leg.miles >= C.MIN_LEG_MILES else 0 for leg in legs]
        self.segments: list[Segment] = []
        self.now = start
        self.mile = 0.0

        self.shift_start: datetime | None = None  # None = off duty, 10+ hours rested
        self.shift_driving = 0
        self.since_break = 0  # driving since the last 30+ consecutive minutes not driving
        self.not_driving_run = 0  # length of the current run of non-driving time
        self.cycle = round(cycle_used_hours * 60)
        self.miles_since_fuel = 0.0
        self.pickup_done = False

        # Which 10-hour rest (counting only those taken once a restart has become
        # unavoidable) to replace with a 34-hour restart; None = only when forced.
        self.restart_at_rest = restart_at_rest
        self.unavoidable_rests = 0

    # --- trip ----------------------------------------------------------------

    def run(self) -> list[Segment]:
        self.drive_leg(0)
        self.on_duty_task(C.PICKUP_MINUTES, Activity.PICKUP, REASON_PICKUP)
        self.pickup_done = True
        self.drive_leg(1)
        self.on_duty_task(C.DROPOFF_MINUTES, Activity.DROPOFF, REASON_DROPOFF)
        self.add(Status.ON_DUTY, C.POST_TRIP_MINUTES, Activity.POST_TRIP, REASON_TRIP_END)
        return self.segments

    def drive_leg(self, index: int) -> None:
        if self.remaining[index] == 0:
            return
        leg = self.legs[index]
        miles_per_minute = leg.miles / self.remaining[index]
        leg_end_mile = self.mile + leg.miles

        while self.remaining[index] > 0:
            self.ensure_shift()
            limits = self.limits(miles_per_minute)
            chunk = min(self.remaining[index], limits.smallest())
            if chunk == 0:
                self.take_required_stop(limits)
                continue
            self.remaining[index] -= chunk
            # The last chunk lands exactly on the leg's end, whatever the rounding.
            miles = leg_end_mile - self.mile if self.remaining[index] == 0 else miles_per_minute * chunk
            self.add(Status.DRIVING, chunk, Activity.DRIVING, miles=miles, leg_index=index)

    def on_duty_task(self, minutes: int, activity: Activity, reason: str) -> None:
        self.ensure_shift()
        self.add(Status.ON_DUTY, minutes, activity, reason)

    # --- limits ------------------------------------------------------------

    def limits(self, miles_per_minute: float) -> Limits:
        fuel_miles_left = C.FUEL_INTERVAL_MILES - self.miles_since_fuel
        return Limits(
            driving=max(0, C.MAX_DRIVING_PER_SHIFT - self.shift_driving),
            window=self.window_left(),
            since_break=max(0, C.MAX_DRIVING_WITHOUT_BREAK - self.since_break),
            cycle=max(0, floor_slot(C.CYCLE_LIMIT - self.cycle)),
            # rounded down so the truck stops before, never after, the 1,000-mile mark
            fuel=max(0, floor_slot(fuel_miles_left / miles_per_minute)),
        )

    def window_left(self) -> int:
        if self.shift_start is None:
            return C.SHIFT_WINDOW
        return max(0, floor_slot(C.SHIFT_WINDOW - minutes_between(self.shift_start, self.now)))

    def take_required_stop(self, limits: Limits) -> None:
        """A limit is at zero: insert what it requires, strongest rule first."""
        if limits.cycle == 0:
            self.restart(REASON_CYCLE_LIMIT)
        elif limits.driving == 0:
            self.daily_rest(REASON_DRIVING_LIMIT)
        elif limits.window == 0:
            self.daily_rest(REASON_WINDOW_LIMIT)
        elif limits.fuel == 0:
            self.add(Status.ON_DUTY, C.FUEL_MINUTES, Activity.FUEL, REASON_FUEL)
        else:
            self.take_break(limits)

    def take_break(self, limits: Limits) -> None:
        # Skip a break that would leave almost no driving in the shift; rest instead.
        driving_after_break = min(limits.driving, limits.window - C.BREAK_MINUTES, limits.cycle)
        if driving_after_break < C.MIN_USEFUL_DRIVE:
            self.daily_rest(REASON_BREAK_SKIPPED)
        else:
            self.add(C.BREAK_STATUS, C.BREAK_MINUTES, Activity.BREAK, REASON_BREAK)

    # --- shifts and rests ----------------------------------------------------

    def remaining_driving(self) -> int:
        return sum(self.remaining)

    def cycle_available_after_rest(self) -> int:
        """On-duty minutes left in the 70-hour cycle once the next shift has started."""
        post_trip = C.POST_TRIP_MINUTES if self.shift_start is not None else 0
        return floor_slot(C.CYCLE_LIMIT - self.cycle - post_trip - C.PRE_TRIP_MINUTES)

    def ensure_shift(self) -> None:
        """Start a shift (pre-trip inspection) if the driver is resting.

        At the start of the trip, restart first only if the cycle leaves less
        than about an hour of driving; otherwise driving what is left before
        restarting gets the load there sooner.
        """
        if self.shift_start is not None:
            return
        needed = self.remaining_driving()
        if needed and self.cycle_available_after_rest() < min(C.RESTART_ESCALATION_DRIVE, needed):
            hours_left = max(0, C.CYCLE_LIMIT - self.cycle) / 60
            self.restart(f'Only {hours_left:g} h left in the 70-hour cycle')
        self.add(Status.ON_DUTY, C.PRE_TRIP_MINUTES, Activity.PRE_TRIP, REASON_SHIFT_START)

    def daily_rest(self, reason: str) -> None:
        needed = self.remaining_driving() + (0 if self.pickup_done else C.PICKUP_MINUTES)
        if self.cycle_available_after_rest() < needed:
            # A restart is unavoidable; candidate_timelines() tries taking it at each such rest.
            rest_index = self.unavoidable_rests
            self.unavoidable_rests += 1
            if rest_index == self.restart_at_rest:
                self.restart(f'{reason}; 70-hour cycle cannot cover the rest of the trip')
                return
        self.end_shift()
        self.add(C.DAILY_REST_STATUS, C.DAILY_REST_MINUTES, Activity.REST, reason)
        self.reset_shift()

    def restart(self, reason: str) -> None:
        self.end_shift()
        self.add(C.RESTART_STATUS, C.RESTART_MINUTES, Activity.RESTART, reason)
        self.reset_shift()

    def end_shift(self) -> None:
        if self.shift_start is not None:
            self.add(Status.ON_DUTY, C.POST_TRIP_MINUTES, Activity.POST_TRIP, REASON_SHIFT_END)

    def reset_shift(self) -> None:
        self.shift_start = None
        self.shift_driving = 0
        self.since_break = 0

    # --- timeline ------------------------------------------------------------

    def add(
        self,
        status: Status,
        minutes: int,
        activity: Activity,
        reason: str | None = None,
        *,
        miles: float = 0.0,
        leg_index: int | None = None,
    ) -> None:
        """Append a segment and update every clock it affects."""
        if minutes <= 0:
            return
        start, end = self.now, self.now + timedelta(minutes=minutes)
        cycle_before = self.cycle
        self.update_clocks(status, minutes, activity, miles)

        self.segments.append(
            Segment(
                status=status,
                activity=activity,
                start=start,
                end=end,
                start_mile=self.mile,
                end_mile=self.mile + miles,
                reason=reason,
                leg_index=leg_index,
                cycle_before=cycle_before,
                cycle_after=self.cycle,
            )
        )
        self.now = end
        self.mile += miles

    def update_clocks(self, status: Status, minutes: int, activity: Activity, miles: float) -> None:
        if status.is_on_duty:
            if self.shift_start is None:
                self.shift_start = self.now
            self.cycle += minutes

        if status is Status.DRIVING:
            self.shift_driving += minutes
            self.since_break += minutes
            self.not_driving_run = 0
            self.miles_since_fuel += miles
        else:
            # Consecutive non-driving time of any status counts toward the 30-minute break.
            self.not_driving_run += minutes
            if self.not_driving_run >= C.BREAK_MINUTES:
                self.since_break = 0

        if activity is Activity.FUEL:
            self.miles_since_fuel = 0.0
        elif activity is Activity.RESTART:
            self.cycle = 0
