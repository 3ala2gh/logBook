"""Truck routing: OpenRouteService driving-hgv, falling back to the OSRM demo.

Each leg (current → pickup, pickup → drop-off) is routed separately, which
keeps per-leg geometry exact and lets a zero-length leg (current location
equals pickup) skip the provider entirely.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

import requests
from django.conf import settings

from planner import config as C
from planner.geometry import LatLng, haversine_miles
from planner.hos import MIN_LEG_MILES

from .places import Place, ProviderError, http

logger = logging.getLogger(__name__)

ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-hgv/geojson'
OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'
METERS_PER_MILE = 1609.344
SNAP_RADIUS_METERS = 5000  # geocoded city centroids are often off-road
ORS_UNROUTABLE_CODES = {2009, 2010}  # route not found / point not found


class Unroutable(Exception):
    """The provider answered, and there is no road route between the points."""


@dataclass
class RouteLeg:
    miles: float
    minutes: float
    points: list[LatLng]


@dataclass
class Route:
    legs: list[RouteLeg]
    provider: str


def route(stops: list[Place]) -> Route:
    pairs = list(zip(stops, stops[1:], strict=False))
    providers = [('ors', _ors_leg), ('osrm', _osrm_leg)] if settings.ORS_API_KEY else [('osrm', _osrm_leg)]
    last_error = None
    for name, leg_fn in providers:
        try:
            with ThreadPoolExecutor(max_workers=len(pairs)) as pool:
                legs = list(pool.map(lambda pair, fn=leg_fn: _leg(fn, *pair), pairs))
            return Route(legs=legs, provider=name)
        except ProviderError as exc:
            logger.warning('Routing provider %s failed: %s', name, exc)
            last_error = exc
    raise last_error or ProviderError('No routing provider available')


def _leg(leg_fn, a: Place, b: Place) -> RouteLeg:
    if haversine_miles((a.lat, a.lng), (b.lat, b.lng)) < MIN_LEG_MILES:
        return RouteLeg(0.0, 0.0, [(a.lat, a.lng)])
    return leg_fn(a, b)


def _ors_leg(a: Place, b: Place) -> RouteLeg:
    try:
        response = http().post(
            ORS_DIRECTIONS_URL,
            json={
                'coordinates': [[a.lng, a.lat], [b.lng, b.lat]],
                'radiuses': [SNAP_RADIUS_METERS, SNAP_RADIUS_METERS],
            },
            headers={'Authorization': settings.ORS_API_KEY},
            timeout=settings.PROVIDER_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise ProviderError(f'ORS: {exc}') from exc
    data = _json(response)
    if response.status_code != 200:
        code = (data.get('error') or {}).get('code') if isinstance(data.get('error'), dict) else None
        if code in ORS_UNROUTABLE_CODES:
            raise Unroutable(f'{a.label} → {b.label}')
        raise ProviderError(f'ORS: HTTP {response.status_code} {data}')
    feature = data['features'][0]
    summary = feature['properties']['summary']
    points = [(lat, lng) for lng, lat, *_ in feature['geometry']['coordinates']]
    return RouteLeg(summary['distance'] / METERS_PER_MILE, summary['duration'] / 60, points)


def _osrm_leg(a: Place, b: Place) -> RouteLeg:
    url = f'{OSRM_URL}/{a.lng},{a.lat};{b.lng},{b.lat}'
    try:
        response = http().get(
            url,
            params={'overview': 'full', 'geometries': 'geojson'},
            timeout=settings.PROVIDER_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise ProviderError(f'OSRM: {exc}') from exc
    data = _json(response)
    if data.get('code') in ('NoRoute', 'NoSegment'):
        raise Unroutable(f'{a.label} → {b.label}')
    if response.status_code != 200 or data.get('code') != 'Ok':
        raise ProviderError(f'OSRM: HTTP {response.status_code} {data.get("code")}')
    best = data['routes'][0]
    miles = best['distance'] / METERS_PER_MILE
    points = [(lat, lng) for lng, lat in best['geometry']['coordinates']]
    # OSRM's demo profile uses car speeds; plan with a realistic truck average.
    return RouteLeg(miles, miles / C.FALLBACK_TRUCK_MPH * 60, points)


def _json(response) -> dict:
    try:
        return response.json()
    except ValueError:
        return {}


def simplify(points: list[LatLng], max_points: int = 1500) -> list[LatLng]:
    """Thin a polyline for the map, keeping both ends."""
    if len(points) <= max_points:
        return points
    step = len(points) / (max_points - 1)
    thinned = [points[int(i * step)] for i in range(max_points - 1)]
    return [*thinned, points[-1]]
