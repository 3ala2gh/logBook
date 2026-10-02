from datetime import datetime, timedelta

from planner.logs import split_days
from planner.models import Activity, Segment, Status

DAY = datetime(2021, 4, 9)

# FMCSA guide p.18-19: John Doe, Richmond, VA -> Newark, NJ, 04/09/2021.
JOHN_DOE = [
    (Status.ON_DUTY, '06:00', '07:30', 'Richmond, VA'),
    (Status.DRIVING, '07:30', '09:00', 'Richmond, VA'),
    (Status.ON_DUTY, '09:00', '09:30', 'Fredericksburg, VA'),
    (Status.DRIVING, '09:30', '12:00', 'Fredericksburg, VA'),
    (Status.OFF, '12:00', '13:00', 'Baltimore, MD'),
    (Status.DRIVING, '13:00', '15:00', 'Baltimore, MD'),
    (Status.ON_DUTY, '15:00', '15:30', 'Philadelphia, PA'),
    (Status.DRIVING, '15:30', '16:00', 'Philadelphia, PA'),
    (Status.SLEEPER, '16:00', '17:45', 'Cherry Hill, NJ'),
    (Status.DRIVING, '17:45', '19:00', 'Cherry Hill, NJ'),
    (Status.ON_DUTY, '19:00', '21:00', 'Newark, NJ'),
]


def at(hhmm, base=DAY):
    h, m = map(int, hhmm.split(':'))
    return base + timedelta(hours=h, minutes=m)


def make_segments(rows, base=DAY, cycle=0):
    segments = []
    for status, start, end, place in rows:
        s, e = at(start, base), at(end, base)
        minutes = int((e - s).total_seconds() // 60)
        before = cycle
        cycle += minutes if status.is_on_duty else 0
        activity = Activity.DRIVING if status is Status.DRIVING else Activity.OFF_DUTY
        segments.append(
            Segment(status, activity, s, e, 0, 0, cycle_before=before, cycle_after=cycle, place=place)
        )
    return segments


def test_john_doe_golden_day():
    [day] = split_days(make_segments(JOHN_DOE), 0)
    assert day.totals == {Status.OFF: 10, Status.SLEEPER: 1.75, Status.DRIVING: 7.75, Status.ON_DUTY: 4.5}
    assert [(r.minute, r.place) for r in day.remarks] == [
        (360, 'Richmond, VA'),
        (450, 'Richmond, VA'),
        (540, 'Fredericksburg, VA'),
        (570, 'Fredericksburg, VA'),
        (720, 'Baltimore, MD'),
        (780, 'Baltimore, MD'),
        (900, 'Philadelphia, PA'),
        (930, 'Philadelphia, PA'),
        (960, 'Cherry Hill, NJ'),
        (1065, 'Cherry Hill, NJ'),
        (1140, 'Newark, NJ'),
        (1260, 'Newark, NJ'),
    ]
    assert day.recap.on_duty_today == 12.25
    assert day.recap.cycle_total == 12.25
    assert day.recap.available_tomorrow == 57.75
    assert day.from_place == 'Richmond, VA' and day.to_place == 'Newark, NJ'


def test_segment_crossing_midnight_is_cut():
    rows = [
        (Status.DRIVING, '20:00', '22:00', 'A, TX'),
        (Status.SLEEPER, '22:00', '32:00', 'B, TX'),  # until 08:00 next day
        (Status.ON_DUTY, '32:00', '32:15', 'B, TX'),
    ]
    days = split_days(make_segments(rows, cycle=600), 10)
    assert len(days) == 2
    assert days[0].totals[Status.SLEEPER] == 2 and days[1].totals[Status.SLEEPER] == 8
    for day in days:
        assert sum(day.totals.values()) == 24
    # the sleeper period continuing past midnight is not a new change of duty status
    assert days[1].remarks[0].minute == 8 * 60
    assert days[0].recap.cycle_total == 12  # 10 prior + 2 driving
    assert days[1].recap.cycle_total == 12.25


def test_trip_ending_at_midnight_has_no_empty_day():
    rows = [(Status.DRIVING, '20:00', '24:00', 'A, TX')]
    days = split_days(make_segments(rows), 0)
    assert len(days) == 1
    assert days[0].segments[-1].end_minute == 1440
