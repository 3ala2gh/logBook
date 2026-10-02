"""One error shape for the whole API: {"error": {"code", "message", "field"?}}.

Domain and provider exceptions are translated here, in one place, so views
stay free of try/except and every endpoint answers the same way.
"""

from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from planner.hos import PlanningError
from services.http import ProviderError
from services.routing import Unroutable

logger = logging.getLogger(__name__)

UNROUTABLE_MESSAGE = (
    'We could not find a truck route between these locations. Check that all three can be '
    'reached by road (for example, not across an ocean).'
)
PROVIDER_DOWN_MESSAGE = 'A map service is not responding right now. Please try again in a minute.'
INTERNAL_MESSAGE = 'Something went wrong on our side. Please try again.'


class TripError(APIException):
    """An expected failure we can explain to the user."""

    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(
        self, message: str, *, code: str = 'BAD_REQUEST', field: str | None = None, status_code=None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.field = field
        if status_code:
            self.status_code = status_code


def _error(code: str, message: str, http_status: int, field: str | None = None) -> Response:
    body = {'code': code, 'message': message}
    if field:
        body['field'] = field
    return Response({'error': body}, status=http_status)


def _first_validation_error(detail, prefix: str = '') -> tuple[str | None, str]:
    """The first message in DRF's nested error dict, with a dotted field path."""
    if isinstance(detail, dict):
        for key, value in detail.items():
            name = key if key == 'non_field_errors' else f'{prefix}{key}'
            return _first_validation_error(value, f'{name}.')
    if isinstance(detail, list) and detail:
        return _first_validation_error(detail[0], prefix)
    return prefix.rstrip('.') or None, str(detail)


def exception_handler(exc, context):
    if isinstance(exc, TripError):
        return _error(exc.code, exc.message, exc.status_code, exc.field)
    if isinstance(exc, ValidationError):
        field, message = _first_validation_error(exc.detail)
        return _error(
            'VALIDATION', message, status.HTTP_400_BAD_REQUEST, None if field == 'non_field_errors' else field
        )
    if isinstance(exc, PlanningError):
        return _error('VALIDATION', str(exc), status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, Unroutable):
        return _error('UNROUTABLE', UNROUTABLE_MESSAGE, status.HTTP_422_UNPROCESSABLE_ENTITY)
    if isinstance(exc, ProviderError):
        logger.warning('Provider unavailable: %s', exc)
        return _error('PROVIDER_DOWN', PROVIDER_DOWN_MESSAGE, status.HTTP_502_BAD_GATEWAY)

    response = drf_exception_handler(exc, context)
    if response is not None:  # DRF's own errors: 404, 405, throttling…
        detail = (
            response.data.get('detail', 'Request failed.')
            if isinstance(response.data, dict)
            else 'Request failed.'
        )
        response.data = {'error': {'code': 'HTTP_ERROR', 'message': str(detail)}}
        return response

    logger.exception('Unhandled error')
    return _error('INTERNAL', INTERNAL_MESSAGE, status.HTTP_500_INTERNAL_SERVER_ERROR)
