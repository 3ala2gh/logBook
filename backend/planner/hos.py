"""Hours of Service trip planner.

Pure Python: takes routed legs and the driver's cycle hours, returns a
timeline of duty-status segments that obeys the property-carrying HOS rules.
No Django, no network.

The algorithm walks a task queue (drive leg 1, pickup, drive leg 2, drop-off)
and, for each driving step, drives the largest chunk that every limit allows.
When a limit binds it inserts what that limit requires (break, fuel, 10-hour
rest or 34-hour restart) and continues.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import datetime, timedelta

from . import config as C
from .models import Activity, Leg, Segment, Status

MIN_LEG_MILES = 0.05


class PlanningError(ValueError):
    pass


def ceil_slot(minutes: float) -> int:
    return int(math.ceil(minutes / C.SLOT_MINUTES - 1e-9)) * C.SLOT_MINUTES


def floor_slot(minutes: float) -> int:
    return int(math.floor(minutes / C.SLOT_MINUTES + 1e-9)) * C.SLOT_MINUTES


def round_up_to_slot(moment: datetime) -> datetime:
    """Round a datetime up to the next quarter hour (seconds dropped)."""
    moment = moment.replace(second=0, microsecond=0) + (
        timedelta(minutes=1) if moment.second or moment.microsecond else timedelta()
    )
    extra = (-moment.minute) % C.SLOT_MINUTES
    return moment + timedelta(minutes=extra)


def build_timeline(legs: Sequence[Leg], cycle_used_hours: float, start: datetime) -> list[Segment]:
    """Plan the trip. `legs` is [current→pickup, pickup→dropoff]; `start` must be on a quarter hour.

    When the 70-hour cycle cannot cover the whole trip, a 34-hour restart is
    unavoidable. It can replace any of the 10-hour rests taken from then on,
    or be left until the cycle actually runs out. Each option is planned and
    the one that finishes earliest wins (ties go to the later restart).
    """
    return min(candidate_timelines(legs, cycle_used_hours, start), key=lambda option: option[-1].end)


def candidate_timelines(legs: Sequence[Leg], cycle_used_hours: float, start: datetime) -> list[list[Segment]]:
    baseline = _Planner(legs, cycle_used_hours, start)
    options = [baseline.run()]
    for k in reversed(range(baseline.unavoidable_rests)):  # min() keeps the first of equals
        options.append(_Planner(legs, cycle_used_hours, start, restart_at_rest=k).run())
    return options


class _Planner:
    def __init__(
        self,
        legs: Sequence[Leg],
        cycle_used_hours: float,
        start: datetime,
        restart_at_rest: int | None = None,
    ):
        if len(legs) != 2:
            raise PlanningError('Expected two legs: current → pickup and pickup → drop-off.')
        if not 0 <= cycle_used_hours <= C.CYCLE_LIMIT / 60:
            raise PlanningError('Cycle hours used must be between 0 and 70.')
        if start.second or start.microsecond or start.minute % C.SLOT_MINUTES:
            raise PlanningError('Start time must be on a quarter hour.')
        for leg in legs:
            if leg.miles < 0 or leg.minutes < 0:
                raise PlanningError('Leg distance and duration must not be negative.')

        self.legs = list(legs)
        # Quantized driving time per leg (rounded up, so we never under-plan driving).
        self.remaining = [ceil_slot(leg.minutes) if leg.miles >= MIN_LEG_MILES else 0 for leg in legs]
        self.segments: list[Segment] = []
        self.now = start
        self.mile = 0.0

        self.shift_start: datetime | None = None  # None = off duty, 10+ hours rested
        self.shift_drive = 0
        self.since_break = 0  # driving since the last 30+ consecutive minutes not driving
        self.not_driving_run = 0  # length of the current run of non-driving time
        self.cycle = round(cycle_used_hours * 60)
        self.miles_since_fuel = 0.0
        self.pickup_done = False

        # Which 10-hour rest (counting only those taken once a restart has become
        # unavoidable) to replace with a 34-hour restart; None = only when forced.
        self.restart_at_rest = restart_at_rest
        self.unavoidable_rests = 0

    # --- main loop -------------------------------------------------------

    def run(self) -> list[Segment]:
        self.drive_leg(0)
        self.on_duty_task(C.PICKUP_MINUTES, Activity.PICKUP, 'Loading at the shipper (1 hour)')
        self.pickup_done = True
        self.drive_leg(1)
        self.on_duty_task(C.DROPOFF_MINUTES, Activity.DROPOFF, 'Unloading at the receiver (1 hour)')
        self.add(Status.ON_DUTY, C.POST_TRIP_MINUTES, Activity.POST_TRIP, 'End of trip')
        return self.segments

    def drive_leg(self, index: int) -> None:
        total = self.remaining[index]
        if total == 0:
            return
        leg = self.legs[index]
        miles_per_minute = leg.miles / total
        leg_start_mile = self.mile

        while self.remaining[index] > 0:
            self.ensure_shift()
            limits = self.limits(miles_per_minute)
            chunk = min(self.remaining[index], *limits.values())
            if chunk > 0:
                last = chunk == self.remaining[index]
                miles = (leg_start_mile + leg.miles - self.mile) if last else miles_per_minute * chunk
                self.remaining[index] -= chunk
                self.add(Status.DRIVING, chunk, Activity.DRIVING, miles=miles, leg_index=index)
            else:
                self.resolve(limits)

    def on_duty_task(self, minutes: int, activity: Activity, reason: str) -> None:
        self.ensure_shift()
        self.add(Status.ON_DUTY, minutes, activity, reason)

    # --- limits ------------------------------------------------------------

    def window_left(self) -> int:
        if self.shift_start is None:
            return C.SHIFT_WINDOW
        used = int((self.now - self.shift_start).total_seconds() // 60)
        return max(0, floor_slot(C.SHIFT_WINDOW - used))

    def limits(self, miles_per_minute: float) -> dict[str, int]:
        fuel_miles_left = C.FUEL_INTERVAL_MILES - self.miles_since_fuel
        return {
            'drive11': max(0, C.MAX_DRIVING_PER_SHIFT - self.shift_drive),
            'window14': self.window_left(),
            'break8': max(0, C.MAX_DRIVING_WITHOUT_BREAK - self.since_break),
            'cycle70': max(0, floor_slot(C.CYCLE_LIMIT - self.cycle)),
            'fuel': max(0, floor_slot(fuel_miles_left / miles_per_minute)),
        }

    def resolve(self, limits: dict[str, int]) -> None:
        """Some limit is at zero: insert whatever it requires, strongest first."""
        if limits['cycle70'] == 0:
            self.restart('70-hour/8-day limit reached')
        elif limits['drive11'] == 0 or limits['window14'] == 0:
            reason = (
                '11-hour driving limit reached'
                if limits['drive11'] == 0
                else '14-hour driving window reached'
            )
            self.daily_rest(reason)
        elif limits['fuel'] == 0:
            self.add(Status.ON_DUTY, C.FUEL_MINUTES, Activity.FUEL, 'Fuel at least every 1,000 miles')
        else:  # break8
            after_break = min(limits['drive11'], limits['window14'] - C.BREAK_MINUTES, limits['cycle70'])
            if after_break < C.MIN_USEFUL_DRIVE:
                self.daily_rest('Shift nearly over: resting for 10 hours instead of a 30-minute break')
            else:
                self.add(
                    C.BREAK_STATUS, C.BREAK_MINUTES, Activity.BREAK, '8 hours of driving since last break'
                )

    # --- rests -------------------------------------------------------------

    def remaining_driving(self) -> int:
        return sum(self.remaining)

    def cycle_available_after_rest(self) -> int:
        """On-duty minutes left in the 70-hour cycle once the next shift has started."""
        post = C.POST_TRIP_MINUTES if self.shift_start is not None else 0
        return floor_slot(C.CYCLE_LIMIT - self.cycle - post - C.PRE_TRIP_MINUTES)

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
            hours = max(0, C.CYCLE_LIMIT - self.cycle) / 60
            self.restart(f'Only {hours:g} h left in the 70-hour cycle')
        self.add(Status.ON_DUTY, C.PRE_TRIP_MINUTES, Activity.PRE_TRIP, 'Start of shift')

    def daily_rest(self, reason: str) -> None:
        needed = self.remaining_driving() + (0 if self.pickup_done else C.PICKUP_MINUTES)
        if self.cycle_available_after_rest() < needed:
            # A restart is unavoidable; build_timeline tries taking it here.
            index = self.unavoidable_rests
            self.unavoidable_rests += 1
            if index == self.restart_at_rest:
                self.restart(f'{reason}; 70-hour cycle cannot cover the rest of the trip')
                return
        self.end_shift()
        self.add(C.DAILY_REST_STATUS, C.DAILY_REST_MINUTES, Activity.REST, reason)
        self.reset_shift()

    def restart(self, reason: str) -> None:
        self.end_shift()
        self.add(C.RESTART_STATUS, C.RESTART_MINUTES, Activity.RESTART, reason)
        self.cycle = 0
        self.segments[-1].cycle_after = 0
        self.reset_shift()

    def end_shift(self) -> None:
        if self.shift_start is not None:
            self.add(Status.ON_DUTY, C.POST_TRIP_MINUTES, Activity.POST_TRIP, 'End of shift')

    def reset_shift(self) -> None:
        self.shift_start = None
        self.shift_drive = 0
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
        if minutes <= 0:
            return
        start, end = self.now, self.now + timedelta(minutes=minutes)
        cycle_before = self.cycle

        if status.is_on_duty:
            if self.shift_start is None:
                self.shift_start = start
            self.cycle += minutes
        if status is Status.DRIVING:
            self.shift_drive += minutes
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
