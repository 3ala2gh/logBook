"""Group a timeline's non-driving segments into stops for the map and stop timeline."""

from __future__ import annotations

from collections.abc import Sequence

from .models import Activity, Segment, Status, Stop, StopType

# When a stop contains several activities, the first match here names it,
# e.g. post-trip + 10-hr rest + pre-trip is a "10-hr rest" stop.
STOP_KINDS: list[tuple[Activity, StopType, str]] = [
    (Activity.RESTART, StopType.RESTART, '34-hr restart'),
    (Activity.REST, StopType.REST, '10-hr rest'),
    (Activity.PICKUP, StopType.PICKUP, 'Pickup'),
    (Activity.DROPOFF, StopType.DROPOFF, 'Drop-off'),
    (Activity.FUEL, StopType.FUEL, 'Fuel stop'),
    (Activity.BREAK, StopType.BREAK, '30-min break'),
    (Activity.PRE_TRIP, StopType.START, 'Trip start'),
    (Activity.POST_TRIP, StopType.INSPECTION, 'Inspection'),
]

START_REASON = 'Pre-trip inspection, then depart'


def group_stops(segments: Sequence[Segment]) -> list[Stop]:
    return [_make_stop(segments, run) for run in _non_driving_runs(segments)]


def _non_driving_runs(segments: Sequence[Segment]) -> list[list[int]]:
    """Indexes of each run of consecutive non-driving segments."""
    runs: list[list[int]] = []
    for i, seg in enumerate(segments):
        if seg.status is Status.DRIVING:
            continue
        if runs and runs[-1][-1] == i - 1:
            runs[-1].append(i)
        else:
            runs.append([i])
    return runs


def _make_stop(segments: Sequence[Segment], indexes: list[int]) -> Stop:
    members = [segments[i] for i in indexes]
    activities = {seg.activity for seg in members}
    activity, kind, label = next(entry for entry in STOP_KINDS if entry[0] in activities)
    main = next(seg for seg in members if seg.activity is activity)
    reason = START_REASON if kind is StopType.START else main.reason
    return Stop(type=kind, label=label, reason=reason, segments=members, segment_indexes=indexes)
