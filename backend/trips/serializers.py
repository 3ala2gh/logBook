from datetime import datetime

from rest_framework import serializers


class LocationSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=300)
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)


class LogDetailsSerializer(serializers.Serializer):
    driver_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    co_driver = serializers.CharField(max_length=100, required=False, allow_blank=True)
    carrier = serializers.CharField(max_length=150, required=False, allow_blank=True)
    main_office = serializers.CharField(max_length=200, required=False, allow_blank=True)
    home_terminal = serializers.CharField(max_length=200, required=False, allow_blank=True)
    truck_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    trailer_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    manifest_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    shipper = serializers.CharField(max_length=150, required=False, allow_blank=True)
    commodity = serializers.CharField(max_length=150, required=False, allow_blank=True)


class PlanRequestSerializer(serializers.Serializer):
    current = LocationSerializer()
    pickup = LocationSerializer()
    dropoff = LocationSerializer()
    cycle_used_hours = serializers.FloatField(
        min_value=0,
        max_value=70,
        error_messages={
            'min_value': 'Cycle hours used must be between 0 and 70.',
            'max_value': 'Cycle hours used must be between 0 and 70.',
            'invalid': 'Cycle hours used must be a number between 0 and 70.',
        },
    )
    # ISO 8601. Without an offset it is read as home-terminal time.
    start_time = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    log_details = LogDetailsSerializer(required=False)

    def validate_start_time(self, value):
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


class GeocodeQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=2, max_length=200, trim_whitespace=True)
