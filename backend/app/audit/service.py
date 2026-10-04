"""Audit trail writer. Application code only ever appends here."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session, object_session
from starlette.requests import Request

from app.audit.models import AuditLog
from app.core.database import SessionLocal
from app.core.enums import AuditAction, AuditResult
from app.core.logging import request_id_var
from app.core.security import mask_ip
from app.users.models import User

logger = logging.getLogger(__name__)


def record(
    db: Session,
    *,
    action: AuditAction,
    entity: str,
    entity_id: str | uuid.UUID | None = None,
    actor: User | None = None,
    actor_id: uuid.UUID | None = None,
    actor_label: str | None = None,
    actor_role: str | None = None,
    result: AuditResult = AuditResult.SUCCESS,
    detail: dict[str, Any] | None = None,
    request: Request | None = None,
) -> AuditLog:
    """Append an audit row.

    Flushes but does not commit — the caller's transaction owns the write so an
    audit entry and the change it describes succeed or fail together.
    """
    ip_masked = None
    user_agent = None
    if request is not None:
        from app.core.rate_limit import client_ip

        ip_masked = mask_ip(client_ip(request))
        user_agent = request.headers.get("user-agent")

    entry = AuditLog(
        actor_id=actor.id if actor is not None else actor_id,
        actor_label=actor_label or (actor.name if actor is not None else "system"),
        actor_role=actor_role or (actor.role if actor is not None else "system"),
        action=action.value,
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else None,
        result=result.value,
        detail=detail or {},
        request_id=request_id_var.get(),
        ip_masked=ip_masked,
        user_agent=user_agent,
    )
    db.add(entry)
    db.flush()
    return entry


def _write_independently(kwargs: dict[str, Any]) -> None:
    """Write one audit row on its own connection without ever hanging the caller.

    A short `lock_timeout` bounds the wait. If the referenced actor row is locked
    (another transaction is updating it), the retry drops the actor reference so the
    insert no longer needs the FK row lock — the denial is still recorded, only the
    actor id is dropped and the label kept. Never raises.
    """
    for drop_actor_reference in (False, True):
        attempt = dict(kwargs)
        if drop_actor_reference:
            attempt["actor"] = None
            attempt["actor_id"] = None

        try:
            with SessionLocal() as db:
                db.execute(text("SET LOCAL lock_timeout = '2000ms'"))
                record(db, **attempt)
                db.commit()
            return
        except IntegrityError:
            logger.warning(
                "audit_actor_reference_unresolvable",
                extra={"action": str(kwargs.get("action"))},
            )
        except OperationalError:
            # Lock timeout / transient connection error: retry without the actor,
            # which is the part that needed the contended row lock.
            logger.warning(
                "audit_write_retry_without_actor",
                extra={"action": str(kwargs.get("action"))},
            )
        except Exception:
            logger.exception(
                "audit_write_failed",
                extra={"action": str(kwargs.get("action"))},
            )
            return

    logger.error(
        "audit_write_abandoned",
        extra={"action": str(kwargs.get("action"))},
    )


def write_deferred_audits(queue: list[dict[str, Any]]) -> None:
    """Flush refusal audits queued during a request, after its session has closed."""
    for kwargs in queue:
        _write_independently(kwargs)


def record_independently(**kwargs: Any) -> None:
    """Write an audit row for a refusal, outside the caller's transaction.

    A denied request ends in an exception that rolls its session back — so a row
    written on that session would disappear with the work it described, and the
    denial is precisely the event most worth keeping.

    Writing it on a *second* connection while the request's session still holds an
    uncommitted lock on the actor's `users` row (the last-seen/profile flush done
    when the token is resolved) would make the audit's `FOR KEY SHARE` FK check wait
    on the caller's own transaction — pinning the worker until the statement timeout
    and leaving the API unresponsive.

    So, inside a request, the row is queued and written by `get_db` *after* the
    session closes (locks released): the caller never waits and the audit still
    lands. Outside a request (no request-scoped session) it is written immediately.
    """
    actor = kwargs.get("actor")
    session = object_session(actor) if actor is not None else None
    if session is not None and session.info.get("_pithros_request_session"):
        # Snapshot the actor while it is still attached: by the time the deferred
        # write runs, the request session is closed and the instance is expired.
        snapshot = dict(kwargs)
        if actor is not None:
            snapshot.pop("actor", None)
            snapshot["actor_id"] = actor.id
            snapshot.setdefault("actor_label", actor.name)
            snapshot.setdefault("actor_role", actor.role)
        session.info.setdefault("_pithros_audit_queue", []).append(snapshot)
        return
    _write_independently(kwargs)
