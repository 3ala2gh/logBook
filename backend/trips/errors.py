"""Uniform API error shape: {"error": {"code", "message", "field"?}}."""

import logging

from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


class TripError(APIException):
    """An expected failure we can explain to the user."""

    status_code = status.HTTP_400_BAD_REQUEST
    code = 'BAD_REQUEST'

    def __init__(self, message, *, code=None, field=None, status_code=None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.field = field


def _first_validation_error(detail, prefix=''):
    if isinstance(detail, dict):
        for key, value in detail.items():
            name = key if key == 'non_field_errors' else f'{prefix}{key}'
            return _first_validation_error(value, f'{name}.')
    if isinstance(detail, list) and detail:
        return _first_validation_error(detail[0], prefix)
    return prefix.rstrip('.') or None, str(detail)


def exception_handler(exc, context):
    if isinstance(exc, TripError):
        body = {'code': exc.code, 'message': exc.message}
        if exc.field:
            body['field'] = exc.field
        return Response({'error': body}, status=exc.status_code)

    if isinstance(exc, ValidationError):
        field, message = _first_validation_error(exc.detail)
        body = {'code': 'VALIDATION', 'message': message}
        if field and field != 'non_field_errors':
            body['field'] = field
        return Response({'error': body}, status=status.HTTP_400_BAD_REQUEST)

    response = drf_exception_handler(exc, context)
    if response is not None:
        message = 'Request failed.'
        if isinstance(response.data, dict):
            message = response.data.get('detail', message)
        response.data = {'error': {'code': 'HTTP_ERROR', 'message': str(message)}}
        return response

    logger.exception('Unhandled error')
    return Response(
        {'error': {'code': 'INTERNAL', 'message': 'Something went wrong on our side. Please try again.'}},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
