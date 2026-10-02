"""Pithros API application factory."""

from __future__ import annotations

import importlib
import logging

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import engine
from app.core.errors import AppError
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.core.redis import redis_healthy
from app.media.storage import storage_is_reachable

logger = logging.getLogger(__name__)

TAGS = [
    {
        "name": "Auth",
        "description": "Identity is issued by Firebase; Pithros resolves the account.",
    },
    {"name": "Users", "description": "Current-user profile."},
    {"name": "Memorials", "description": "Authenticated memorial management."},
    {"name": "Public memorials", "description": "Anonymous-safe memorial projections."},
    {"name": "Media", "description": "Direct-to-storage uploads."},
    {"name": "Tributes", "description": "Tributes and remembrance offerings."},
    {"name": "Contributors", "description": "Family membership and invitations."},
    {"name": "Verification", "description": "Document verification workflow."},
    {"name": "Providers", "description": "Farewell service partners."},
    {"name": "Leads", "description": "Service enquiries."},
    {"name": "Payments", "description": "Orders, invoices and refunds."},
    {"name": "Notifications", "description": "In-app notifications."},
    {"name": "Admin", "description": "Administrative operations."},
    {"name": "Storage (development)", "description": "Local stand-in for presigned S3 URLs."},
]


def _register_exception_handlers(app: FastAPI) -> None:
    """Every failure leaves through one envelope shape.

    The frontend's error handling parses `{error: {code, message, details}}`, so a
    response that does not match it is worse than useless — the UI cannot tell what
    went wrong. `requestId` is included so a user can quote it to support.
    """

    def envelope(
        request: Request, *, code: str, message: str, details: object = None
    ) -> dict[str, object]:
        return {
            "error": {
                "code": code,
                "message": message,
                "details": details,
                "requestId": getattr(request.state, "request_id", None),
            }
        }

    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError) -> JSONResponse:
        if exc.status_code >= 500:
            logger.error(
                "app_error",
                extra={"code": exc.code, "route": request.url.path},
                exc_info=exc,
            )
        return JSONResponse(
            status_code=exc.status_code,
            content=envelope(request, code=exc.code, message=exc.message, details=exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=envelope(
                request,
                code="validation_error",
                message="The request could not be processed.",
                details=exc.errors(),
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=envelope(
                request,
                code=f"http_{exc.status_code}",
                message=str(exc.detail),
            ),
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        """Last resort.

        Without this, an unexpected error escapes FastAPI's handlers and Starlette
        returns a bare `"Internal Server Error"` — a body the frontend cannot parse,
        so the user sees nothing useful and the request ID is lost.
        """
        logger.exception("unhandled_exception", extra={"route": request.url.path})
        return JSONResponse(
            status_code=500,
            content=envelope(
                request,
                code="internal_error",
                message="Something went wrong on our side. Please try again.",
            ),
        )


def _build_api_router() -> APIRouter:
    from app.audit.router import router as audit_router
    from app.billing.router import router as billing_router
    from app.contributors.router import invitation_router
    from app.contributors.router import me_router as contributors_me_router
    from app.contributors.router import router as contributors_router
    from app.media.router import router as media_router
    from app.memorials.router import me_router, public_router
    from app.memorials.router import router as memorials_router
    from app.notifications.router import router as notifications_router
    from app.privacy.router import admin_router as privacy_admin_router
    from app.privacy.router import router as privacy_router
    from app.providers.router import admin_router as providers_admin_router
    from app.providers.router import partner_router as providers_partner_router
    from app.providers.router import public_router as providers_public_router
    from app.tributes.router import moderation_router as tribute_moderation_router
    from app.tributes.router import router as tributes_router
    from app.users.router import router as users_router
    from app.verification.router import admin_router as verification_admin_router
    from app.verification.router import evidence_router as verification_evidence_router
    from app.verification.router import router as verification_router

    api = APIRouter(prefix=settings.api_v1_prefix)
    api.include_router(users_router)
    api.include_router(me_router)
    api.include_router(notifications_router)
    api.include_router(privacy_router)
    api.include_router(contributors_me_router)
    api.include_router(invitation_router)
    api.include_router(public_router)
    api.include_router(memorials_router)
    api.include_router(contributors_router)
    api.include_router(media_router)
    api.include_router(tributes_router)
    api.include_router(tribute_moderation_router)
    api.include_router(verification_router)
    api.include_router(verification_evidence_router)
    api.include_router(verification_admin_router)
    api.include_router(providers_partner_router)
    api.include_router(providers_public_router)
    api.include_router(providers_admin_router)
    api.include_router(audit_router)
    api.include_router(billing_router)
    api.include_router(privacy_admin_router)

    @api.get("/health", tags=["Admin"], summary="Liveness")
    async def api_health() -> dict[str, str]:
        return {"status": "ok", "environment": settings.environment}

    @api.get("/ready", tags=["Admin"], summary="Readiness")
    async def api_ready() -> JSONResponse:
        return _perform_readiness_checks()

    return api


def _perform_readiness_checks() -> JSONResponse:
    checks: dict[str, bool] = {}

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        checks["database"] = False

    checks["redis"] = redis_healthy()
    checks["storage"] = storage_is_reachable()

    required_ready = checks["database"] and checks["redis"]
    return JSONResponse(
        status_code=200 if required_ready else 503,
        content={"status": "ready" if required_ready else "degraded", "checks": checks},
    )


def create_app() -> FastAPI:
    # Imported for its side effect: registering every model on Base.metadata so
    # SQLAlchemy mappers configure. Uses import_module rather than a plain import
    # because `import app.models_registry` binds the name `app` to the package and
    # would shadow the ASGI callable at the bottom of this module.
    importlib.import_module("app.models_registry")

    configure_logging()

    app = FastAPI(
        title="Pithros API",
        version="1.0.0",
        description=(
            "Backend for the Pithros digital memorial platform. "
            "Firebase provides identity; this service is the business authority."
        ),
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )

    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "X-RateLimit-Remaining", "X-RateLimit-Limit"],
        max_age=600,
    )

    _register_exception_handlers(app)

    app.include_router(_build_api_router())

    if settings.storage_backend == "local" and not settings.is_production:
        from app.media.local_router import router as local_storage_router

        app.include_router(local_storage_router, prefix=settings.api_v1_prefix)
        logger.warning("local_storage_enabled", extra={"backend": settings.storage_backend})

    @app.get("/health", tags=["Admin"], summary="Liveness")
    async def health() -> dict[str, str]:
        """Process is alive. Deliberately does no I/O and never returns secrets."""
        return {"status": "ok", "environment": settings.environment}

    @app.get("/ready", tags=["Admin"], summary="Readiness")
    async def ready() -> JSONResponse:
        """Dependencies the API needs to serve requests."""
        return _perform_readiness_checks()

    return app


app = create_app()
