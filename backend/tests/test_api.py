import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from planner.geometry import haversine_miles
from services import geocoding, routing
from services.places import Place, ProviderError
from services.routing import Route, RouteLeg, Unroutable

LA = {'label': 'Los Angeles, CA', 'lat': 34.0522, 'lng': -118.2437}
DALLAS = {'label': 'Dallas, TX', 'lat': 32.7767, 'lng': -96.797}
NYC = {'label': 'New York, NY', 'lat': 40.7128, 'lng': -74.006}


def straight_route(stops):
    legs = []
    for a, b in zip(stops, stops[1:], strict=False):
        miles = haversine_miles((a.lat, a.lng), (b.lat, b.lng)) * 1.2
        if miles < 0.05:
            legs.append(RouteLeg(0, 0, [(a.lat, a.lng)]))
        else:
            legs.append(RouteLeg(miles, miles / 55 * 60, [(a.lat, a.lng), (b.lat, b.lng)]))
    return Route(legs, 'fake')


@pytest.fixture(autouse=True)
def fake_providers(monkeypatch):
    cache.clear()
    monkeypatch.setattr(routing, 'route', straight_route)
    monkeypatch.setattr(geocoding, 'reverse', lambda lat, lng: f'Town{round(lat)}{round(-lng)}, ST')


@pytest.fixture
def client():
    return APIClient()


def plan(client, **overrides):
    body = {'current': LA, 'pickup': DALLAS, 'dropoff': NYC, 'cycle_used_hours': 20,
            'start_time': '2026-10-05T08:00'}  # fmt: skip
    body.update(overrides)
    return client.post('/api/trips/plan/', body, format='json')


def test_plan_response_shape(client):
    response = plan(client)
    assert response.status_code == 200, response.json()
    data = response.json()
    assert set(data) >= {'summary', 'route', 'stops', 'segments', 'daily_logs', 'log_details', 'assumptions'}

    summary = data['summary']
    assert summary['timezone'] == 'America/Los_Angeles'
    assert summary['start'] == '2026-10-05T08:00:00-07:00'
    assert summary['days'] == len(data['daily_logs']) >= 4
    assert summary['total_miles'] == pytest.approx(
        sum(leg['miles'] for leg in data['route']['legs']), abs=0.2
    )

    for day in data['daily_logs']:
        assert sum(day['totals'].values()) == pytest.approx(24)
        assert day['segments'][0]['start_minute'] == 0 and day['segments'][-1]['end_minute'] == 1440

    types = [s['type'] for s in data['stops']]
    assert types[0] == 'start' and 'pickup' in types and types[-1] == 'dropoff'
    assert types.index('pickup') < types.index('dropoff')
    assert all(s['place'] for s in data['segments'])
    assert data['log_details']['home_terminal']


def test_start_time_defaults_to_now(client):
    body = {'current': LA, 'pickup': DALLAS, 'dropoff': NYC, 'cycle_used_hours': 0}
    response = client.post('/api/trips/plan/', body, format='json')
    assert response.status_code == 200
    assert response.json()['summary']['start'][14:16] in ('00', '15', '30', '45')


def test_current_equals_pickup(client):
    response = plan(client, current=DALLAS)
    assert response.status_code == 200
    data = response.json()
    assert data['route']['legs'][0]['miles'] == 0
    assert data['stops'][0]['type'] == 'pickup'


@pytest.mark.parametrize('cycle', [-1, 70.5, 'abc'])
def test_cycle_hours_validation(client, cycle):
    response = plan(client, cycle_used_hours=cycle)
    assert response.status_code == 400
    error = response.json()['error']
    assert error['code'] == 'VALIDATION' and error['field'] == 'cycle_used_hours'
    assert '70' in error['message']


def test_missing_location(client):
    response = client.post(
        '/api/trips/plan/', {'pickup': DALLAS, 'dropoff': NYC, 'cycle_used_hours': 1}, format='json'
    )
    assert response.status_code == 400
    assert response.json()['error']['field'] == 'current'


def test_unroutable(client, monkeypatch):
    def fail(stops):
        raise Unroutable('Honolulu → Dallas')

    monkeypatch.setattr(routing, 'route', fail)
    response = plan(client, current={'label': 'Honolulu, HI', 'lat': 21.3, 'lng': -157.8})
    assert response.status_code == 422
    assert response.json()['error']['code'] == 'UNROUTABLE'


def test_provider_down(client, monkeypatch):
    def fail(stops):
        raise ProviderError('timeout')

    monkeypatch.setattr(routing, 'route', fail)
    response = plan(client)
    assert response.status_code == 502
    assert response.json()['error']['code'] == 'PROVIDER_DOWN'


def test_geocode(client, monkeypatch):
    monkeypatch.setattr(geocoding, 'search', lambda q: [Place('Dallas, TX', 32.7, -96.8)])
    response = client.get('/api/geocode/', {'q': 'dall'})
    assert response.status_code == 200
    assert response.json() == [{'label': 'Dallas, TX', 'lat': 32.7, 'lng': -96.8}]


def test_geocode_requires_query(client):
    response = client.get('/api/geocode/', {'q': ''})
    assert response.status_code == 400
    assert response.json()['error']['code'] == 'VALIDATION'


def test_photon_label_formatting():
    label = geocoding._photon_label(
        {'name': 'Dallas', 'state': 'Texas', 'country': 'United States', 'countrycode': 'US'}
    )
    assert label == 'Dallas, TX'
    label = geocoding._photon_label(
        {'name': 'Union Station', 'city': 'Chicago', 'state': 'Illinois', 'countrycode': 'US'}
    )
    assert label == 'Union Station, Chicago, IL'
