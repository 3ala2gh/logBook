"""Truck routing: OpenRouteService driving-hgv, falling back to the OSRM demo.

Each leg (current → pickup, pickup → drop-off) is routed separately, which
keeps per-leg geometry exact and lets a zero-length leg (current location
equals pickup) skip the provider entirely.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from functools import partial

from django.conf import settings

from planner import config as C
from planner.geometry import LatLng, haversine_miles

from .http import ProviderError, json_or_empty, request
from .places import Place

logger = logging.getLogger(__name__)

ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-hgv/geojson'
OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'
METERS_PER_MILE = 1609.344
SNAP_RADIUS_METERS = 5000  # geocoded city centroids are often off-road
ORS_UNROUTABLE_CODES = {2009, 2010}  # route not found / point not found
OSRM_UNROUTABLE_CODES = {'NoRoute', 'NoSegment'}


class Unroutable(Exception):
    """The provider answered, and there is no road route between the points."""


@dataclass(frozen=True)
class RouteLeg:
    miles: float
    minutes: float
    points: list[LatLng]


@dataclass(frozen=True)
class Route:
    legs: list[RouteLeg]
    provider: str


LegRouter = Callable[[Place, Place], RouteLeg]


def route(stops: list[Place]) -> Route:
    """Route consecutive stops, trying each provider until one succeeds."""
    pairs = list(zip(stops, stops[1:], strict=False))
    last_error: ProviderError | None = None
    for name, route_leg in _providers():
        try:
            with ThreadPoolExecutor(max_workers=len(pairs)) as pool:
                legs = list(pool.map(partial(_route_pair, route_leg), pairs))
            return Route(legs=legs, provider=name)
        except ProviderError as exc:
            logger.warning('Routing provider %s failed: %s', name, exc)
            last_error = exc
    raise last_error or ProviderError('No routing provider available')


def _providers() -> list[tuple[str, LegRouter]]:
    providers: list[tuple[str, LegRouter]] = [('osrm', _osrm_leg)]
    if settings.ORS_API_KEY:
        providers.insert(0, ('ors', _ors_leg))
    return providers


def _route_pair(route_leg: LegRouter, pair: tuple[Place, Place]) -> RouteLeg:
    a, b = pair
    if haversine_miles(a.point, b.point) < C.MIN_LEG_MILES:
        return RouteLeg(0.0, 0.0, [a.point])
    return route_leg(a, b)


def _ors_leg(a: Place, b: Place) -> RouteLeg:
    response = request(
        'POST',
        ORS_DIRECTIONS_URL,
        json={
            'coordinates': [[a.lng, a.lat], [b.lng, b.lat]],
            'radiuses': [SNAP_RADIUS_METERS, SNAP_RADIUS_METERS],
        },
        headers={'Authorization': settings.ORS_API_KEY},
    )
    data = json_or_empty(response)
    if response.status_code != 200:
        error = data.get('error')
        if isinstance(error, dict) and error.get('code') in ORS_UNROUTABLE_CODES:
            raise Unroutable(f'{a.label} → {b.label}')
        raise ProviderError(f'ORS: HTTP {response.status_code} {data}')

    feature = data['features'][0]
    summary = feature['properties']['summary']
    points = [(lat, lng) for lng, lat, *_ in feature['geometry']['coordinates']]
    return RouteLeg(summary['distance'] / METERS_PER_MILE, summary['duration'] / 60, points)


def _osrm_leg(a: Place, b: Place) -> RouteLeg:
    response = request(
        'GET',
        f'{OSRM_URL}/{a.lng},{a.lat};{b.lng},{b.lat}',
        params={'overview': 'full', 'geometries': 'geojson'},
    )
    data = json_or_empty(response)
    if data.get('code') in OSRM_UNROUTABLE_CODES:
        raise Unroutable(f'{a.label} → {b.label}')
    if response.status_code != 200 or data.get('code') != 'Ok':
        raise ProviderError(f'OSRM: HTTP {response.status_code} {data.get("code")}')

    best = data['routes'][0]
    miles = best['distance'] / METERS_PER_MILE
    points = [(lat, lng) for lng, lat in best['geometry']['coordinates']]
    # OSRM's demo profile uses car speeds; plan with a realistic truck average.
    return RouteLeg(miles, miles / C.FALLBACK_TRUCK_MPH * 60, points)
