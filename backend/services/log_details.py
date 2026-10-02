"""Header fields for the log sheets that the four required inputs don't provide."""

from __future__ import annotations

from collections.abc import Mapping

# Placeholders shown when the user leaves "Log sheet details" empty (mirrored in
# frontend/src/features/trip-form/constants.ts).
DEFAULT_LOG_DETAILS: dict[str, str] = {
    'driver_name': 'Alex Driver',
    'co_driver': '',
    'carrier': 'Demo Freight Lines',
    'main_office': 'Dallas, TX',
    'home_terminal': '',  # defaults to the current location
    'truck_number': 'TRK 101',
    'trailer_number': 'TRL 2048',
    'manifest_number': 'BOL-104233',
    'shipper': 'Acme Distribution',
    'commodity': 'General freight',
}


def resolve_log_details(requested: Mapping[str, str] | None, home_terminal: str) -> dict[str, str]:
    """Defaults overlaid with whatever the user filled in (blank fields keep the default)."""
    details = DEFAULT_LOG_DETAILS | {key: value for key, value in (requested or {}).items() if value}
    details['home_terminal'] = details['home_terminal'] or home_terminal
    return details
