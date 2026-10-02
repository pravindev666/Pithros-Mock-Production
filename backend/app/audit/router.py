"""Audit trail read endpoint.

Admin-only on purpose: the trail names actors, records denials, and is the record
of who did what. It is read-only — nothing here can modify history.
"""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.models import AuditLog
from app.auth.dependencies import require_admin_role
from app.core.database import get_db
from app.core.enums import AdminSubRole
from app.core.pagination import PageParams, apply_page_headers, page_params, paginate
from app.users.models import User

router = APIRouter(prefix="/admin/audit", tags=["Admin"])

DbSession = Annotated[Session, Depends(get_db)]
AuditReader = Annotated[
    User,
    Depends(require_admin_role(AdminSubRole.SUPER_ADMIN, AdminSubRole.ADMIN)),
]


@router.get("", summary="List audit events (paged)")
def list_audit_events(
    response: Response,
    admin_user: AuditReader,
    db: DbSession,
    params: Annotated[PageParams, Depends(page_params)],
    action: Annotated[str | None, Query(max_length=64)] = None,
    entity: Annotated[str | None, Query(max_length=64)] = None,
    actor_id: uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    """Newest first. Page metadata travels in `X-Next-Cursor` / `X-Has-More`."""
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity:
        stmt = stmt.where(AuditLog.entity == entity)
    if actor_id:
        stmt = stmt.where(AuditLog.actor_id == actor_id)

    page = paginate(db, stmt, model=AuditLog, params=params)
    apply_page_headers(response, page)

    return [
        {
            "id": str(row.id),
            "action": row.action,
            "entity": row.entity,
            "entityId": row.entity_id,
            "actorLabel": row.actor_label,
            "actorRole": row.actor_role,
            "result": row.result,
            "detail": row.detail or {},
            "requestId": row.request_id,
            "ipMasked": row.ip_masked,
            "createdAt": row.created_at.isoformat(),
        }
        for row in page.items
    ]
