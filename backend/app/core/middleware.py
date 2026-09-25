"""Request correlation and access logging middleware."""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import request_id_var, user_id_var

logger = logging.getLogger("pithros.access")

_UNLOGGED_PATHS = {"/health", "/ready", "/favicon.ico"}


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        token = request_id_var.set(request_id)
        user_token = user_id_var.set(None)
        request.state.request_id = request_id

        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - started) * 1000
            logger.exception(
                "request_failed",
                extra={
                    "route": request.url.path,
                    "method": request.method,
                    "duration_ms": round(duration_ms, 2),
                },
            )
            raise
        else:
            duration_ms = (time.perf_counter() - started) * 1000
            response.headers["X-Request-ID"] = request_id
            if request.url.path not in _UNLOGGED_PATHS:
                logger.info(
                    "request",
                    extra={
                        "method": request.method,
                        "route": request.url.path,
                        "status": response.status_code,
                        "duration_ms": round(duration_ms, 2),
                        "user_id": user_id_var.get(),
                    },
                )
            return response
        finally:
            request_id_var.reset(token)
            user_id_var.reset(user_token)
