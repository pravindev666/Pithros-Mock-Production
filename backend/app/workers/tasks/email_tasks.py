"""Invitation email delivery.

The invitation row is created and committed by the HTTP request; this task only
delivers the message. A slow or unavailable SMTP server therefore never blocks or
fails the invite itself — the invitation is durable, and delivery is retried.

The raw token is passed only so the message can contain the accept link. It is
never logged, and it is validated against the stored hash so a stale job (token
rotated, accepted, revoked, or expired) is silently dropped instead of emailing a
dead link. A transient delivery failure raises so Celery retries with backoff.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.enums import ContributorStatus
from app.core.security import hash_token
from app.email.invitations import send_contributor_invitation
from app.memorials.models import Memorial, MemorialContributor
from app.users.models import User
from app.workers.base import RecordedTask
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    """Transient delivery failure — raised so Celery retries with backoff."""


def deliver_contributor_invitation(contributor_id: str, token: str) -> dict[str, str]:
    """Render and send one invitation email. Returns a non-secret status."""
    if not settings.email_enabled:
        # No transport configured: not a failure, and not retryable.
        logger.info("invitation_email_skipped_disabled", extra={"contributor_id": contributor_id})
        return {"status": "disabled"}

    with SessionLocal() as db:
        contributor = db.get(MemorialContributor, uuid.UUID(contributor_id))
        if contributor is None:
            logger.warning("invitation_email_missing_row", extra={"contributor_id": contributor_id})
            return {"status": "missing"}

        if contributor.status != ContributorStatus.INVITED.value:
            return {"status": "not_pending"}

        # A rotated/accepted/revoked invitation no longer matches this token.
        if contributor.invitation_token_hash != hash_token(token):
            return {"status": "stale"}

        if contributor.invitation_expires_at is not None and (
            contributor.invitation_expires_at <= datetime.now(UTC)
        ):
            return {"status": "expired"}

        recipient = (contributor.invited_email or "").strip()
        if not recipient:
            return {"status": "no_recipient"}

        memorial = db.get(Memorial, contributor.memorial_id)
        inviter = db.get(User, contributor.invited_by_id) if contributor.invited_by_id else None
        memorial_id = str(contributor.memorial_id)
        invitation_url = f"{settings.frontend_base_url.rstrip('/')}/invite/{token}"

        delivered = send_contributor_invitation(
            recipient=recipient,
            recipient_name=contributor.display_name or recipient,
            memorial_name=memorial.full_name if memorial else "a loved one",
            inviter_name=inviter.name if inviter else "A family member",
            invitation_url=invitation_url,
            expires_at=contributor.invitation_expires_at,
        )

    if not delivered:
        raise EmailDeliveryError("invitation email delivery failed")

    logger.info(
        "invitation_email_sent",
        extra={"contributor_id": contributor_id, "memorial_id": memorial_id},
    )
    return {"status": "sent"}


@celery_app.task(
    name="app.workers.tasks.email_tasks.send_contributor_invitation_email",
    base=RecordedTask,
    bind=True,
    autoretry_for=(EmailDeliveryError,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=3,
)
def send_contributor_invitation_email(self: Any, contributor_id: str, token: str) -> dict[str, str]:
    return deliver_contributor_invitation(contributor_id, token)
