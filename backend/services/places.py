"""Shared helpers for provider clients: HTTP session and "City, ST" labels."""

from __future__ import annotations

from dataclasses import dataclass

import requests
from django.conf import settings

US_STATES = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL',
    'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA',
    'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
    'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR',
    'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
    'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA',
    'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    'Puerto Rico': 'PR',
    # Canadian provinces, for cross-border trips
    'Alberta': 'AB', 'British Columbia': 'BC', 'Manitoba': 'MB', 'New Brunswick': 'NB',
    'Newfoundland and Labrador': 'NL', 'Nova Scotia': 'NS', 'Ontario': 'ON',
    'Prince Edward Island': 'PE', 'Quebec': 'QC', 'Québec': 'QC', 'Saskatchewan': 'SK',
}  # fmt: skip


class ProviderError(Exception):
    """A provider failed in a way the next provider might not."""


@dataclass(frozen=True)
class Place:
    label: str
    lat: float
    lng: float

    def as_dict(self) -> dict:
        return {'label': self.label, 'lat': self.lat, 'lng': self.lng}


def state_abbr(state: str | None) -> str | None:
    if not state:
        return None
    return US_STATES.get(state, state)


def city_state(city: str | None, state: str | None, country: str | None = None) -> str | None:
    """Format "City, ST" (or "City, Country" outside the US and Canada)."""
    abbr = state_abbr(state)
    if city and abbr and abbr != state:
        return f'{city}, {abbr}'
    if city and country and country not in ('United States', 'Canada'):
        return f'{city}, {country}'
    if city and abbr:
        return f'{city}, {abbr}'
    return city or abbr


_session = None


def http() -> requests.Session:
    global _session
    if _session is None:
        _session = requests.Session()
        _session.headers['User-Agent'] = settings.GEOCODER_USER_AGENT
    return _session


def get_json(url: str, **kwargs) -> dict:
    kwargs.setdefault('timeout', settings.PROVIDER_TIMEOUT_SECONDS)
    try:
        response = http().get(url, **kwargs)
    except requests.RequestException as exc:
        raise ProviderError(f'{url}: {exc}') from exc
    if response.status_code != 200:
        raise ProviderError(f'{url}: HTTP {response.status_code}')
    return response.json()
