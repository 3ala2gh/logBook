"""Location search (autocomplete) and reverse geocoding to "City, ST".

Providers, in order: OpenRouteService when ORS_API_KEY is set, then Photon
(komoot), which is built for search-as-you-type and needs no key. Nominatim
is deliberately not used for autocomplete; its usage policy forbids it.
Results are cached, and reverse lookups are deduplicated on a ~3 mile grid.
"""

from __future__ import annotations

import hashlib
import logging
from collections.abc import Iterable
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.core.cache import cache

from planner.geometry import LatLng

from .http import ProviderError, get_json
from .places import Place, city_state, state_abbr

logger = logging.getLogger(__name__)

PHOTON_URL = 'https://photon.komoot.io'
ORS_GEOCODE_URL = 'https://api.openrouteservice.org/geocode'
US_CENTER = (39.8, -98.6)  # bias search results toward the continental US
SEARCH_LIMIT = 6
REVERSE_GRID = 20  # cache reverse lookups per 1/20 degree (~3 miles)
REVERSE_RADIUS_KM = 60
REVERSE_WORKERS = 4


# --- public API ----------------------------------------------------------------


def search(query: str) -> list[Place]:
    """Autocomplete suggestions for a partial address or city."""
    query = ' '.join(query.split())
    key = 'geo:search:' + hashlib.sha1(query.lower().encode()).hexdigest()
    cached = cache.get(key)
    if cached is not None:
        return cached

    last_error: ProviderError | None = None
    for searcher in _with_ors_first(_ors_search, _photon_search):
        try:
            results = searcher(query)
        except ProviderError as exc:
            logger.warning('Geocoder failed: %s', exc)
            last_error = exc
            continue
        cache.set(key, results)
        return results
    raise last_error or ProviderError('No geocoder available')


def reverse(lat: float, lng: float) -> str | None:
    """Nearest town as "City, ST", or None if every provider fails."""
    key = f'geo:rev:{_grid_cell((lat, lng))}'
    cached = cache.get(key)
    if cached is not None:
        return cached or None

    label = None
    for geocoder in _with_ors_first(_ors_reverse, _photon_reverse):
        try:
            label = geocoder(lat, lng)
        except ProviderError as exc:
            logger.warning('Reverse geocoder failed: %s', exc)
            continue
        if label:
            break
    cache.set(key, label or '')  # cache misses too, so a failing point isn't retried every plan
    return label


def reverse_many(points: Iterable[LatLng]) -> dict[LatLng, str | None]:
    """Reverse-geocode several points in parallel, one request per grid cell."""
    points = list(dict.fromkeys(points))
    by_cell = {}
    for point in points:
        by_cell.setdefault(_grid_cell(point), point)
    with ThreadPoolExecutor(max_workers=REVERSE_WORKERS) as pool:
        labels = dict(zip(by_cell, pool.map(lambda p: reverse(*p), by_cell.values()), strict=True))
    return {point: labels[_grid_cell(point)] for point in points}


def _grid_cell(point: LatLng) -> tuple[int, int]:
    return round(point[0] * REVERSE_GRID), round(point[1] * REVERSE_GRID)


def _with_ors_first[T](ors: T, fallback: T) -> list[T]:
    return [ors, fallback] if settings.ORS_API_KEY else [fallback]


# --- Photon ------------------------------------------------------------------------


def _photon_label(props: dict) -> str:
    """A suggestion label such as "Union Station, Chicago, IL" from a Photon feature's properties."""
    name = props.get('name')
    if not name and props.get('street'):
        name = ' '.join(filter(None, [props.get('housenumber'), props['street']]))
    city = props.get('city') or props.get('county')
    abbr = state_abbr(props.get('state'))
    country = props.get('country')
    parts = [name]
    if city and city != name:
        parts.append(city)
    if abbr and abbr != name:
        parts.append(abbr)
    if country and props.get('countrycode') not in ('US', None):
        parts.append(country)
    return ', '.join(dict.fromkeys(part for part in parts if part))


def _photon_search(query: str) -> list[Place]:
    data = get_json(
        f'{PHOTON_URL}/api/',
        params={'q': query, 'limit': SEARCH_LIMIT, 'lang': 'en', 'lat': US_CENTER[0], 'lon': US_CENTER[1]},
    )
    places, seen = [], set()
    for feature in data.get('features', []):
        lng, lat = feature['geometry']['coordinates'][:2]
        label = _photon_label(feature.get('properties', {}))
        if label and label not in seen:
            seen.add(label)
            places.append(Place(label, lat, lng))
    return places


def _photon_reverse(lat: float, lng: float) -> str | None:
    # layer=city returns the nearest town rather than the nearest road, which is
    # what the Remarks section asks for ("city, town, or village, and State").
    data = get_json(
        f'{PHOTON_URL}/reverse',
        params={
            'lat': lat,
            'lon': lng,
            'limit': 1,
            'lang': 'en',
            'layer': 'city',
            'radius': REVERSE_RADIUS_KM,
        },
    )
    features = data.get('features') or []
    if not features:
        return None
    props = features[0].get('properties', {})
    city = props.get('name') or props.get('city') or props.get('county')
    return city_state(city, props.get('state'), props.get('country'))


# --- OpenRouteService --------------------------------------------------------------


def _ors_search(query: str) -> list[Place]:
    data = get_json(
        f'{ORS_GEOCODE_URL}/autocomplete',
        params={
            'api_key': settings.ORS_API_KEY,
            'text': query,
            'size': SEARCH_LIMIT,
            'focus.point.lat': US_CENTER[0],
            'focus.point.lon': US_CENTER[1],
        },
    )
    places = []
    for feature in data.get('features', []):
        lng, lat = feature['geometry']['coordinates'][:2]
        label = feature.get('properties', {}).get('label', '').removesuffix(', USA')
        if label:
            places.append(Place(label, lat, lng))
    return places


def _ors_reverse(lat: float, lng: float) -> str | None:
    data = get_json(
        f'{ORS_GEOCODE_URL}/reverse',
        params={
            'api_key': settings.ORS_API_KEY,
            'point.lat': lat,
            'point.lon': lng,
            'size': 1,
            'layers': 'locality,localadmin,county',
        },
    )
    features = data.get('features') or []
    if not features:
        return None
    props = features[0].get('properties', {})
    city = props.get('locality') or props.get('localadmin') or props.get('name')
    if props.get('country_a') not in ('USA', 'CAN', None):
        return city_state(city, None, props.get('country'))
    abbr = props.get('region_a') or state_abbr(props.get('region'))
    return f'{city}, {abbr}' if city and abbr else city
