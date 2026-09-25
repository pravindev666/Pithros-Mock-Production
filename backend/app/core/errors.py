"""Domain errors that map cleanly onto HTTP responses."""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str, *, details: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"


class RateLimitedError(AppError):
    status_code = 429
    code = "rate_limited"


class StorageError(AppError):
    status_code = 502
    code = "storage_error"


def forbidden_without_leaking(what: str = "resource") -> NotFoundError:
    """Return 404 for objects whose existence the caller must not learn.

    A 403 would confirm that a private memorial exists; an attacker could then
    enumerate the platform. Callers must use this for every non-public object.
    """
    return NotFoundError(f"{what.capitalize()} not found")
