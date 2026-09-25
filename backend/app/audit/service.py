"""Audit trail writer. Application code only ever appends here."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.models import AuditLog
from app.core.enums import AuditAction, AuditResult
from app.core.logging import request_id_var
from app.core.security import mask_ip
from app.users.models import User


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
