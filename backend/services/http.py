"""Shared HTTP plumbing for provider clients."""

from __future__ import annotations

from functools import lru_cache

import requests
from django.conf import settings


class ProviderError(Exception):
    """A provider failed in a way the next provider might not (timeout, 5xx, quota)."""


@lru_cache(maxsize=1)
def session() -> requests.Session:
    """One pooled session; identifies the app as the OSM services' usage policies require."""
    http = requests.Session()
    http.headers['User-Agent'] = settings.GEOCODER_USER_AGENT
    return http


def request(method: str, url: str, **kwargs) -> requests.Response:
    """Send a request; network failures become ProviderError. The caller checks the status."""
    kwargs.setdefault('timeout', settings.PROVIDER_TIMEOUT_SECONDS)
    try:
        return session().request(method, url, **kwargs)
    except requests.RequestException as exc:
        raise ProviderError(f'{url}: {exc}') from exc


def get_json(url: str, **kwargs) -> dict:
    """GET a JSON document; anything but a 200 is a ProviderError."""
    response = request('GET', url, **kwargs)
    if response.status_code != 200:
        raise ProviderError(f'{url}: HTTP {response.status_code}')
    return json_or_empty(response)


def json_or_empty(response: requests.Response) -> dict:
    try:
        return response.json()
    except ValueError:
        return {}
