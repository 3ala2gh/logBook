from datetime import datetime
from zoneinfo import ZoneInfo

from services.log_details import DEFAULT_LOG_DETAILS, resolve_log_details
from services.places import Place, city_state
from services.timezones import home_timezone, local_start

LA = Place('Los Angeles, CA', 34.05, -118.24)
LA_TZ = ZoneInfo('America/Los_Angeles')


def test_home_timezone_comes_from_the_current_location():
    assert home_timezone(LA).key == 'America/Los_Angeles'
    assert home_timezone(Place('New York, NY', 40.71, -74.0)).key == 'America/New_York'


def test_start_time_without_offset_is_home_terminal_time():
    assert local_start(datetime(2026, 10, 5, 8, 5), LA_TZ) == datetime(2026, 10, 5, 8, 15)


def test_start_time_with_offset_is_converted():
    utc_noon = datetime(2026, 10, 5, 15, 0, tzinfo=ZoneInfo('UTC'))
    assert local_start(utc_noon, LA_TZ) == datetime(2026, 10, 5, 8, 0)


def test_blank_log_details_keep_the_defaults():
    details = resolve_log_details(
        {'driver_name': 'Sam Rivera', 'carrier': ''}, home_terminal='Los Angeles, CA'
    )
    assert details['driver_name'] == 'Sam Rivera'
    assert details['carrier'] == DEFAULT_LOG_DETAILS['carrier']
    assert details['home_terminal'] == 'Los Angeles, CA'


def test_city_state_labels():
    assert city_state('Pecos', 'Texas') == 'Pecos, TX'
    assert city_state('Toronto', 'Ontario', 'Canada') == 'Toronto, ON'
    assert city_state('Monterrey', 'Nuevo León', 'Mexico') == 'Monterrey, Mexico'
