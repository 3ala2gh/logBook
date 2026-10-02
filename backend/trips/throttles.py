"""Per-IP limits that protect the free map services we depend on."""

from rest_framework.throttling import AnonRateThrottle


class GeocodeThrottle(AnonRateThrottle):
    scope = 'geocode'
    rate = '90/min'  # autocomplete is debounced, so this is generous for a person typing


class PlanThrottle(AnonRateThrottle):
    scope = 'plan'
    rate = '20/min'  # each plan costs two routing calls and a batch of reverse lookups
