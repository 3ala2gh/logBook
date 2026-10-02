import logging

from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from planner.hos import PlanningError
from services import geocoding, trip_plan
from services.places import Place, ProviderError
from services.routing import Unroutable

from .errors import TripError
from .serializers import GeocodeQuerySerializer, PlanRequestSerializer

logger = logging.getLogger(__name__)


class GeocodeThrottle(AnonRateThrottle):
    rate = '90/min'


class PlanThrottle(AnonRateThrottle):
    rate = '20/min'


@api_view(['GET'])
def health(request):
    return Response({'status': 'ok'})


@api_view(['GET'])
@throttle_classes([GeocodeThrottle])
def geocode(request):
    query = GeocodeQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    try:
        places = geocoding.search(query.validated_data['q'])
    except ProviderError as exc:
        logger.warning('Geocoding unavailable: %s', exc)
        raise TripError(
            'Location search is temporarily unavailable. Please try again in a moment.',
            code='PROVIDER_DOWN',
            status_code=status.HTTP_502_BAD_GATEWAY,
        ) from exc
    return Response([place.as_dict() for place in places])


@api_view(['POST'])
@throttle_classes([PlanThrottle])
def plan(request):
    body = PlanRequestSerializer(data=request.data)
    body.is_valid(raise_exception=True)
    data = body.validated_data
    current, pickup, dropoff = (Place(**data[k]) for k in ('current', 'pickup', 'dropoff'))

    try:
        result = trip_plan.plan_trip(
            current,
            pickup,
            dropoff,
            data['cycle_used_hours'],
            start_time=data.get('start_time'),
            log_details=data.get('log_details'),
        )
    except Unroutable as exc:
        raise TripError(
            'We could not find a truck route between these locations. Check that all three '
            'can be reached by road (for example, not across an ocean).',
            code='UNROUTABLE',
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        ) from exc
    except ProviderError as exc:
        logger.warning('Routing unavailable: %s', exc)
        raise TripError(
            'The routing service is not responding right now. Please try again in a minute.',
            code='PROVIDER_DOWN',
            status_code=status.HTTP_502_BAD_GATEWAY,
        ) from exc
    except PlanningError as exc:
        raise TripError(str(exc), code='VALIDATION') from exc
    return Response(result)
