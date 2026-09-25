"""Audit trail writer. Application code only ever appends here."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
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
        actor_id=actor.id if actor else None,
        actor_label=actor_label or (actor.name if actor else "system"),
        actor_role=actor_role or (actor.role if actor else "system"),
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


def record_independently(**kwargs: Any) -> None:
    """Write an audit row in its own transaction, outside the caller's.

    Needed for refusals. A denied request ends in an exception, which rolls its
    session back — so a row written on that session would disappear along with the
    work it was describing. The denial is precisely the event most worth keeping.

    Because this uses a separate connection, it can only reference rows that are
    already committed. If the actor is not visible (uncommitted, or deleted), the
    FK would reject the insert — so we retry with the reference dropped and keep the
    label. Losing the actor's id is far better than losing the denial.

    Never raises: a failure to audit must not turn a 403 into a 500.
    """
    for drop_actor_reference in (False, True):
        attempt = dict(kwargs)
        if drop_actor_reference:
            attempt["actor"] = None

        try:
            with SessionLocal() as db:
                record(db, **attempt)
                db.commit()
            return
        except IntegrityError:
            logger.warning(
                "audit_actor_reference_unresolvable",
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
