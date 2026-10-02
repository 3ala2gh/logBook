"""Request validation. Responses are built in presenters.py."""

from __future__ import annotations

from datetime import datetime

from rest_framework import serializers

from planner import config as C
from services.log_details import DEFAULT_LOG_DETAILS
from services.places import Place
from services.trip_plan import TripRequest

CYCLE_HOURS_MAX = C.CYCLE_LIMIT // 60
CYCLE_HOURS_MESSAGE = f'Cycle hours used must be between 0 and {CYCLE_HOURS_MAX}.'


class LocationSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=300)
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)


class LogDetailsSerializer(serializers.Serializer):
    """Optional log-sheet header fields; one optional text field per default."""

    def get_fields(self):
        return {
            name: serializers.CharField(max_length=200, required=False, allow_blank=True)
            for name in DEFAULT_LOG_DETAILS
        }


class PlanRequestSerializer(serializers.Serializer):
    current = LocationSerializer()
    pickup = LocationSerializer()
    dropoff = LocationSerializer()
    cycle_used_hours = serializers.FloatField(
        min_value=0,
        max_value=CYCLE_HOURS_MAX,
        error_messages={
            'min_value': CYCLE_HOURS_MESSAGE,
            'max_value': CYCLE_HOURS_MESSAGE,
            'invalid': CYCLE_HOURS_MESSAGE,
        },
    )
    # ISO 8601. Without an offset it is read as home-terminal time (DRF's
    # DateTimeField would assume UTC, so it is parsed by hand).
    start_time = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    log_details = LogDetailsSerializer(required=False)

    def validate_start_time(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError as exc:
            raise serializers.ValidationError('Start time must look like 2026-10-05T08:00.') from exc

    def validate(self, attrs):
        pickup, dropoff = attrs['pickup'], attrs['dropoff']
        if (pickup['lat'], pickup['lng']) == (dropoff['lat'], dropoff['lng']):
            raise serializers.ValidationError(
                {'dropoff': 'Drop-off must be different from the pickup location.'}
            )
        return attrs

    def to_trip_request(self) -> TripRequest:
        data = self.validated_data
        return TripRequest(
            current=Place(**data['current']),
            pickup=Place(**data['pickup']),
            dropoff=Place(**data['dropoff']),
            cycle_used_hours=data['cycle_used_hours'],
            start_time=data.get('start_time'),
            log_details=data.get('log_details'),
        )


class GeocodeQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=2, max_length=200, trim_whitespace=True)
