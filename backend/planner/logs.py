"""Turn a trip timeline into one Drivers Daily Log per calendar day."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date, datetime, time, timedelta

from . import config as C
from .models import Activity, DayLog, DaySegment, Recap, Remark, Segment, Status
from .slots import minutes_between


class LogError(AssertionError):
    """A generated daily log breaks the form's rules (24 hours, contiguous, quarter hours)."""


def split_days(segments: Sequence[Segment], cycle_used_hours: float) -> list[DayLog]:
    """Cut the timeline at midnights and pad the first and last day with Off Duty."""
    if not segments:
        return []
    initial_cycle = round(cycle_used_hours * 60)
    last_day = (segments[-1].end - timedelta(minutes=1)).date()

    logs, day = [], segments[0].start.date()
    while day <= last_day:
        logs.append(_build_day(segments, day, initial_cycle))
        day += timedelta(days=1)
    return logs


def _build_day(segments: Sequence[Segment], day: date, initial_cycle: int) -> DayLog:
    day_start = datetime.combine(day, time())
    day_end = day_start + timedelta(days=1)
    trip_start, trip_end = segments[0].start, segments[-1].end

    trip_pieces = [
        _slice(seg, day_start, day_end) for seg in segments if seg.start < day_end and seg.end > day_start
    ]
    lead = [_off_duty(0, minutes_between(day_start, trip_start), None)] if trip_start > day_start else []
    tail = (
        [_off_duty(minutes_between(day_start, trip_end), C.DAY_MINUTES, segments[-1].place)]
        if trip_end < day_end
        else []
    )
    pieces = lead + trip_pieces + tail
    _check_day(pieces)

    minutes_by_status = _minutes_by_status(pieces)
    cycle_total = _hours(_cycle_at(segments, day_end, initial_cycle))
    from_place, to_place = _from_to(trip_pieces)

    return DayLog(
        date=day,
        segments=pieces,
        totals={status: _hours(minutes) for status, minutes in minutes_by_status.items()},
        remarks=_remarks(pieces, starts_at_midnight=trip_start == day_start),
        miles_driving=round(sum(p.miles for p in pieces if p.status is Status.DRIVING), 1),
        from_place=from_place,
        to_place=to_place,
        recap=Recap(
            on_duty_today=_hours(minutes_by_status[Status.DRIVING] + minutes_by_status[Status.ON_DUTY]),
            cycle_total=cycle_total,
            available_tomorrow=max(0.0, _hours(C.CYCLE_LIMIT) - cycle_total),
            restart_note=_restart_note(segments, day_start, day_end),
        ),
    )


def _slice(seg: Segment, day_start: datetime, day_end: datetime) -> DaySegment:
    """The part of a segment that falls on this day; miles are split pro rata."""
    start, end = max(seg.start, day_start), min(seg.end, day_end)
    return DaySegment(
        status=seg.status,
        activity=seg.activity,
        start_minute=minutes_between(day_start, start),
        end_minute=minutes_between(day_start, end),
        miles=seg.miles * (end - start) / (seg.end - seg.start),
        place=seg.place,
    )


def _off_duty(start_minute: int, end_minute: int, place: str | None) -> DaySegment:
    return DaySegment(Status.OFF, Activity.OFF_DUTY, start_minute, end_minute, 0.0, place)


def _minutes_by_status(pieces: list[DaySegment]) -> dict[Status, int]:
    totals = dict.fromkeys(Status, 0)
    for piece in pieces:
        totals[piece.status] += piece.end_minute - piece.start_minute
    return totals


def _cycle_at(segments: Sequence[Segment], moment: datetime, initial_cycle: int) -> int:
    """On-duty minutes in the 70-hour cycle at a moment, including part of a segment in progress."""
    cycle = initial_cycle
    for seg in segments:
        if seg.start >= moment:
            break
        if seg.end <= moment:
            cycle = seg.cycle_after
        elif seg.status.is_on_duty:
            cycle = seg.cycle_before + minutes_between(seg.start, moment)
        else:
            cycle = seg.cycle_before  # a restart only resets the total once it is complete
    return cycle


def _restart_note(segments: Sequence[Segment], day_start: datetime, day_end: datetime) -> str | None:
    note = None
    for seg in segments:
        if seg.activity is not Activity.RESTART or seg.end <= day_start or seg.start >= day_end:
            continue
        if seg.end <= day_end:
            note = f'34-hour restart completed at {seg.end:%H:%M}; 70-hour total reset to 0.'
        else:
            note = '34-hour restart in progress.'
    return note


def _from_to(trip_pieces: list[DaySegment]) -> tuple[str | None, str | None]:
    """Where the day's driving starts, and where the driver stops (rests) at its end."""
    with_place = [p for p in trip_pieces if p.place]
    if not with_place:
        return None, None
    stopped = [p for p in with_place if p.status is not Status.DRIVING]
    return with_place[0].place, (stopped or with_place)[-1].place


def _remarks(pieces: list[DaySegment], *, starts_at_midnight: bool) -> list[Remark]:
    """A remark at every change of duty status (and at midnight if the trip starts then)."""
    remarks = []
    for i, piece in enumerate(pieces):
        changed = i > 0 and piece.status is not pieces[i - 1].status
        if changed or (i == 0 and starts_at_midnight):
            place = piece.place or (pieces[i - 1].place if i else None)
            remarks.append(Remark(piece.start_minute, piece.status, piece.activity, place))
    return remarks


def _check_day(pieces: list[DaySegment]) -> None:
    if not pieces or pieces[0].start_minute != 0 or pieces[-1].end_minute != C.DAY_MINUTES:
        raise LogError('Daily log must cover midnight to midnight.')
    for prev, cur in zip(pieces, pieces[1:], strict=False):
        if prev.end_minute != cur.start_minute:
            raise LogError('Daily log segments must be contiguous.')
    for piece in pieces:
        if piece.start_minute % C.SLOT_MINUTES or piece.end_minute % C.SLOT_MINUTES:
            raise LogError('Daily log boundaries must fall on quarter hours.')
        if piece.end_minute <= piece.start_minute:
            raise LogError('Daily log segments must have positive length.')


def _hours(minutes: float) -> float:
    return round(minutes / 60, 2)
