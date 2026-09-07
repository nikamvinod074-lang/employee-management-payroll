import logging

from django.core.exceptions import PermissionDenied
from django.db import DatabaseError
from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Normalizes every error response into a consistent shape and makes sure
    raw backend/database errors are never leaked to the client.

    Shape returned to the frontend:
        { "detail": "human readable message", "errors": {..field errors..} }
    """
    if isinstance(exc, Http404):
        exc = drf_exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = drf_exceptions.PermissionDenied()

    response = exception_handler(exc, context)

    if response is not None:
        data = {"detail": None, "errors": None}
        if isinstance(response.data, dict):
            # Validation errors come back as {field: [errors]}
            if any(isinstance(v, (list, dict)) for v in response.data.values()) and "detail" not in response.data:
                data["errors"] = response.data
                data["detail"] = "Validation failed. Please check the submitted data."
            else:
                data["detail"] = response.data.get("detail", "Request failed.")
        elif isinstance(response.data, list):
            data["detail"] = "Validation failed. Please check the submitted data."
            data["errors"] = {"non_field_errors": response.data}
        else:
            data["detail"] = str(response.data)
        response.data = data
        return response

    # Anything unhandled (DB errors, etc.) - never leak internals.
    if isinstance(exc, DatabaseError):
        logger.exception("Unhandled database error")
        return Response({"detail": "A database error occurred. Please try again later.", "errors": None}, status=500)

    logger.exception("Unhandled server error")
    return Response({"detail": "An unexpected error occurred. Please try again later.", "errors": None}, status=500)
