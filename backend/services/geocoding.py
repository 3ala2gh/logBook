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

from .places import Place, ProviderError, city_state, get_json, state_abbr

logger = logging.getLogger(__name__)

PHOTON_URL = 'https://photon.komoot.io'
ORS_GEOCODE_URL = 'https://api.openrouteservice.org/geocode'
US_CENTER = (39.8, -98.6)  # bias search results toward the continental US
SEARCH_LIMIT = 6
GRID = 20  # reverse-geocode cache grid: 1/20 degree


def search(query: str) -> list[Place]:
    query = ' '.join(query.split())
    key = 'geo:search:' + hashlib.sha1(query.lower().encode()).hexdigest()
    cached = cache.get(key)
    if cached is not None:
        return cached

    providers = [_ors_search, _photon_search] if settings.ORS_API_KEY else [_photon_search]
    results, last_error = None, None
    for provider in providers:
        try:
            results = provider(query)
            break
        except ProviderError as exc:
            logger.warning('Geocoder failed: %s', exc)
            last_error = exc
    if results is None:
        raise last_error or ProviderError('No geocoder available')
    cache.set(key, results)
    return results


def reverse(lat: float, lng: float) -> str | None:
    key = f'geo:rev:{round(lat * GRID)}:{round(lng * GRID)}'
    cached = cache.get(key)
    if cached is not None:
        return cached or None

    providers = [_ors_reverse, _photon_reverse] if settings.ORS_API_KEY else [_photon_reverse]
    label = None
    for provider in providers:
        try:
            label = provider(lat, lng)
            if label:
                break
        except ProviderError as exc:
            logger.warning('Reverse geocoder failed: %s', exc)
    cache.set(key, label or '')
    return label


def reverse_many(points: Iterable[tuple[float, float]]) -> dict[tuple[float, float], str | None]:
    """Reverse-geocode several points in parallel, one request per grid cell."""
    points = list(dict.fromkeys(points))
    by_cell: dict[tuple[int, int], tuple[float, float]] = {}
    for lat, lng in points:
        by_cell.setdefault((round(lat * GRID), round(lng * GRID)), (lat, lng))
    with ThreadPoolExecutor(max_workers=4) as pool:
        labels = dict(zip(by_cell, pool.map(lambda p: reverse(*p), by_cell.values()), strict=True))
    return {p: labels[(round(p[0] * GRID), round(p[1] * GRID))] for p in points}


# --- Photon -----------------------------------------------------------------


def _photon_label(props: dict) -> str:
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
    return ', '.join(dict.fromkeys(p for p in parts if p))


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
        params={'lat': lat, 'lon': lng, 'limit': 1, 'lang': 'en', 'layer': 'city', 'radius': 60},
    )
    features = data.get('features') or []
    if not features:
        return None
    props = features[0].get('properties', {})
    city = props.get('name') or props.get('city') or props.get('county')
    return city_state(city, props.get('state'), props.get('country'))


# --- OpenRouteService ------------------------------------------------------


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
    abbr = props.get('region_a') or state_abbr(props.get('region'))
    if props.get('country_a') not in ('USA', 'CAN', None):
        return city_state(city, None, props.get('country'))
    return f'{city}, {abbr}' if city and abbr else city
