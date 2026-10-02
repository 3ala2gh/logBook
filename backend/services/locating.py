"""Give each timeline segment the coordinates and "City, ST" of where it starts."""

from __future__ import annotations

from collections.abc import Sequence

from planner import config as C
from planner.geometry import LatLng, Polyline
from planner.models import Segment

from . import geocoding
from .places import Place
from .routing import Route

_EPSILON_MILES = 1e-6


class RouteLocator:
    """Maps a mile along the trip to a point, snapping to the user's three places at the ends."""

    def __init__(self, route: Route, current: Place, pickup: Place, dropoff: Place):
        to_pickup, to_dropoff = route.legs
        self.current, self.pickup, self.dropoff = current, pickup, dropoff
        self.pickup_mile = to_pickup.miles if to_pickup.miles >= C.MIN_LEG_MILES else 0.0
        self.total_miles = self.pickup_mile + (
            to_dropoff.miles if to_dropoff.miles >= C.MIN_LEG_MILES else 0.0
        )
        self.to_pickup = Polyline(to_pickup.points, to_pickup.miles or None)
        self.to_dropoff = Polyline(to_dropoff.points, to_dropoff.miles or None)

    def locate(self, mile: float) -> tuple[LatLng, Place | None]:
        """The point at `mile`, and the user's place if it is one of the three trip points."""
        for place, place_mile in (
            (self.current, 0.0),
            (self.pickup, self.pickup_mile),
            (self.dropoff, self.total_miles),
        ):
            if abs(mile - place_mile) <= _EPSILON_MILES:
                return place.point, place
        if mile < self.pickup_mile:
            return self.to_pickup.point_at(mile), None
        return self.to_dropoff.point_at(mile - self.pickup_mile), None


def locate_segments(segments: Sequence[Segment], locator: RouteLocator) -> None:
    """Set lat/lng/place on every segment. The three trip points keep the user's own labels;
    everything en route is reverse-geocoded to the nearest town."""
    located = [locator.locate(seg.start_mile) for seg in segments]
    towns = geocoding.reverse_many(point for point, place in located if place is None)
    for seg, (point, place) in zip(segments, located, strict=True):
        seg.lat, seg.lng = point
        seg.place = place.label if place else towns.get(point) or f'{point[0]:.3f}, {point[1]:.3f}'
