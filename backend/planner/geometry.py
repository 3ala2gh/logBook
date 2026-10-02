"""Distances on the globe and positions along a route polyline."""

from __future__ import annotations

import bisect
import math
from collections.abc import Sequence

EARTH_RADIUS_MILES = 3958.7613

LatLng = tuple[float, float]


def haversine_miles(a: LatLng, b: LatLng) -> float:
    lat1, lng1, lat2, lng2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 2 * EARTH_RADIUS_MILES * math.asin(math.sqrt(h))


class Polyline:
    """A route polyline with cumulative distances, scaled to a known total length.

    The provider's reported distance (road distance) is authoritative; the
    straight-line sum of the simplified geometry is a little shorter, so
    positions are scaled proportionally.
    """

    def __init__(self, points: Sequence[LatLng], total_miles: float | None = None):
        if not points:
            raise ValueError('Polyline needs at least one point.')
        self.points = list(points)
        cumulative = [0.0]
        for a, b in zip(self.points, self.points[1:], strict=False):
            cumulative.append(cumulative[-1] + haversine_miles(a, b))
        geometric = cumulative[-1]
        scale = (total_miles / geometric) if total_miles and geometric > 0 else 1.0
        self.cumulative = [d * scale for d in cumulative]
        self.length = self.cumulative[-1]

    def point_at(self, mile: float) -> LatLng:
        if len(self.points) == 1 or mile <= 0:
            return self.points[0]
        if mile >= self.length:
            return self.points[-1]
        i = bisect.bisect_right(self.cumulative, mile)
        start, end = self.cumulative[i - 1], self.cumulative[i]
        t = (mile - start) / (end - start) if end > start else 0.0
        (lat1, lng1), (lat2, lng2) = self.points[i - 1], self.points[i]
        return (lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t)


def thin(points: Sequence[LatLng], max_points: int = 1500) -> list[LatLng]:
    """Keep at most `max_points` evenly spaced points (both ends kept), for drawing on a map."""
    if len(points) <= max_points:
        return list(points)
    step = len(points) / (max_points - 1)
    return [*(points[int(i * step)] for i in range(max_points - 1)), points[-1]]
