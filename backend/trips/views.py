"""HTTP endpoints. Validation lives in serializers, errors in errors.py, JSON shape in presenters."""

from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response

from services import geocoding, trip_plan

from .presenters import present_place, present_trip
from .serializers import GeocodeQuerySerializer, PlanRequestSerializer
from .throttles import GeocodeThrottle, PlanThrottle


@api_view(['GET'])
def health(request):
    return Response({'status': 'ok'})


@api_view(['GET'])
@throttle_classes([GeocodeThrottle])
def geocode(request):
    query = GeocodeQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    places = geocoding.search(query.validated_data['q'])
    return Response([present_place(place) for place in places])


@api_view(['POST'])
@throttle_classes([PlanThrottle])
def plan(request):
    body = PlanRequestSerializer(data=request.data)
    body.is_valid(raise_exception=True)
    planned = trip_plan.plan_trip(body.to_trip_request())
    return Response(present_trip(planned))
