"""Turn a trip timeline into one Drivers Daily Log per calendar day."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, time, timedelta

from . import config as C
from .models import Activity, DayLog, DaySegment, Recap, Remark, Segment, Status

DAY_MINUTES = 24 * 60


class LogError(AssertionError):
    pass


def _minutes(delta: timedelta) -> int:
    return int(delta.total_seconds() // 60)


def _hours(minutes: float) -> float:
    return round(minutes / 60, 2)


def split_days(segments: Sequence[Segment], cycle_used_hours: float) -> list[DayLog]:
    """Cut the timeline at midnights and pad the first and last day with Off Duty."""
    if not segments:
        return []

    trip_start, trip_end = segments[0].start, segments[-1].end
    initial_cycle = round(cycle_used_hours * 60)
    final_cycle = segments[-1].cycle_after

    day = trip_start.date()
    last_day = (trip_end - timedelta(minutes=1)).date()
    logs = []
    while day <= last_day:
        day_start = datetime.combine(day, time())
        day_end = day_start + timedelta(days=1)
        logs.append(_build_day(segments, day_start, day_end, initial_cycle, final_cycle))
        day += timedelta(days=1)
    return logs


def _build_day(segments, day_start, day_end, initial_cycle, final_cycle) -> DayLog:
    trip_start, trip_end = segments[0].start, segments[-1].end
    pieces: list[DaySegment] = []
    pads: list[DaySegment] = []
    cycle_at_end = initial_cycle
    restart_note = None

    if trip_start > day_start:
        pads.append(DaySegment(Status.OFF, Activity.OFF_DUTY, 0, _minutes(trip_start - day_start), 0.0, None))
        pieces.append(pads[-1])

    for seg in segments:
        start, end = max(seg.start, day_start), min(seg.end, day_end)
        if start >= end:
            continue
        fraction = (end - start) / (seg.end - seg.start)
        pieces.append(
            DaySegment(
                status=seg.status,
                activity=seg.activity,
                start_minute=_minutes(start - day_start),
                end_minute=_minutes(end - day_start),
                miles=seg.miles * fraction,
                place=seg.place,
            )
        )
        if end == seg.end:
            cycle_at_end = seg.cycle_after
        elif seg.status.is_on_duty:
            cycle_at_end = seg.cycle_before + _minutes(end - seg.start)
        else:
            cycle_at_end = seg.cycle_before

        if seg.activity is Activity.RESTART:
            if day_start < seg.end <= day_end:
                restart_note = f'34-hour restart completed at {seg.end:%H:%M}; 70-hour total reset to 0.'
            else:
                restart_note = '34-hour restart in progress.'

    if trip_end < day_end:
        start_minute = _minutes(trip_end - day_start)
        pads.append(
            DaySegment(Status.OFF, Activity.OFF_DUTY, start_minute, DAY_MINUTES, 0.0, segments[-1].place)
        )
        pieces.append(pads[-1])
        cycle_at_end = final_cycle

    _check_day(pieces)

    totals = {status: 0.0 for status in Status}
    for piece in pieces:
        totals[piece.status] += piece.end_minute - piece.start_minute
    on_duty_minutes = totals[Status.DRIVING] + totals[Status.ON_DUTY]
    totals = {status: _hours(minutes) for status, minutes in totals.items()}

    cycle_total = _hours(cycle_at_end)
    trip_pieces = [p for p in pieces if not any(p is pad for pad in pads)]
    resting = [p for p in trip_pieces if p.status is not Status.DRIVING and p.place]
    with_place = [p for p in trip_pieces if p.place]

    return DayLog(
        date=day_start.date(),
        segments=pieces,
        totals=totals,
        remarks=_remarks(pieces, trip_start, day_start),
        miles_driving=round(sum(p.miles for p in pieces if p.status is Status.DRIVING), 1),
        from_place=with_place[0].place if with_place else None,
        to_place=(resting or with_place)[-1].place if with_place else None,
        recap=Recap(
            on_duty_today=_hours(on_duty_minutes),
            cycle_total=cycle_total,
            available_tomorrow=max(0.0, _hours(C.CYCLE_LIMIT) - cycle_total),
            restart_note=restart_note,
        ),
    )


def _remarks(pieces: list[DaySegment], trip_start: datetime, day_start: datetime) -> list[Remark]:
    """A remark at every change of duty status (and at the trip start if it is midnight)."""
    remarks = []
    for i, piece in enumerate(pieces):
        changed = i > 0 and piece.status is not pieces[i - 1].status
        starts_trip = i == 0 and trip_start == day_start
        if changed or starts_trip:
            place = piece.place if piece.place else pieces[i - 1].place if i else None
            remarks.append(Remark(piece.start_minute, piece.status, piece.activity, place))
    return remarks


def _check_day(pieces: list[DaySegment]) -> None:
    if not pieces or pieces[0].start_minute != 0 or pieces[-1].end_minute != DAY_MINUTES:
        raise LogError('Daily log must cover midnight to midnight.')
    for prev, cur in zip(pieces, pieces[1:], strict=False):
        if prev.end_minute != cur.start_minute:
            raise LogError('Daily log segments must be contiguous.')
    for piece in pieces:
        if piece.start_minute % C.SLOT_MINUTES or piece.end_minute % C.SLOT_MINUTES:
            raise LogError('Daily log boundaries must fall on quarter hours.')
        if piece.end_minute <= piece.start_minute:
            raise LogError('Daily log segments must have positive length.')
