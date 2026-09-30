"""Subscription State Machine for PITHROS.

Governs lifecycle transitions strictly adhering to the PRD:
- PENDING -> ACTIVE (server verified payment)
- ACTIVE -> PAST_DUE (renewal attempt failed; premium access preserved during recovery)
- PAST_DUE -> GRACE (automated retries completed without recovery; memorial remains safe)
- GRACE -> EXPIRED_READ_ONLY (grace window elapsed; memorials and media are NEVER deleted)
- ACTIVE/PAST_DUE/GRACE -> CANCELLED (user cancels auto-renewal; remains active until period end)
- PAST_DUE/GRACE/EXPIRED_READ_ONLY -> ACTIVE (successful payment recovery)

HARD RULE: Failed payment or subscription expiration NEVER triggers deletion of
any memorial, user account, tribute, media item, timeline event, or personal data.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.audit import service as audit_service
from app.billing.models import Subscription
from app.core.enums import (
    AuditAction,
    AuditResult,
    SUBSCRIPTION_TRANSITIONS,
    SubscriptionStatus,
)
from app.core.errors import ConflictError

logger = logging.getLogger(__name__)


class SubscriptionStateError(ConflictError):
    """Raised when an illegal subscription state transition is requested."""

    def __init__(self, current_status: str, target_status: str, message: str | None = None) -> None:
        detail = message or f"Cannot transition subscription from '{current_status}' to '{target_status}'."
        super().__init__(detail)
        self.current_status = current_status
        self.target_status = target_status


def transition_subscription_state(
    subscription: Subscription,
    target_status: SubscriptionStatus,
    *,
    reason: str,
    db: Session,
    actor_id: uuid.UUID | None = None,
    extend_period_until: datetime | None = None,
) -> Subscription:
    """Safely execute a state machine transition with audit logging and invariant validation."""
    current_status = SubscriptionStatus(subscription.status)

    if target_status == current_status:
        logger.info(
            "subscription_state_no_op",
            extra={"subscription_id": str(subscription.id), "status": str(current_status)},
        )
        return subscription

    allowed_targets = SUBSCRIPTION_TRANSITIONS.get(current_status, frozenset())
    if target_status not in allowed_targets:
        logger.warning(
            "illegal_subscription_transition_attempted",
            extra={
                "subscription_id": str(subscription.id),
                "from_status": str(current_status),
                "to_status": str(target_status),
                "allowed": [s.value for s in allowed_targets],
            },
        )
        raise SubscriptionStateError(
            current_status.value,
            target_status.value,
            f"Invalid subscription transition from '{current_status.value}' to '{target_status.value}'.",
        )

    now = datetime.now(timezone.utc)
    old_status_val = subscription.status

    # State-specific transition side-effects
    if target_status == SubscriptionStatus.ACTIVE:
        if extend_period_until:
            subscription.current_period_end = extend_period_until
        # Clear grace timestamps upon successful recovery / renewal
        subscription.grace_period_start = None
        subscription.grace_period_end = None
        subscription.cancel_at_period_end = False

    elif target_status == SubscriptionStatus.PAST_DUE:
        # T0 failure: retain premium access, start recovery window
        if not subscription.grace_period_start:
            subscription.grace_period_start = now

    elif target_status == SubscriptionStatus.GRACE:
        # Extended grace window (e.g. 23 days after initial 7 days retry window)
        if not subscription.grace_period_start:
            subscription.grace_period_start = now
        subscription.grace_period_end = now + timedelta(days=23)

    elif target_status == SubscriptionStatus.EXPIRED_READ_ONLY:
        # Paid and grace periods have ended
        # CRITICAL HARD RULE: NO DELETION! All memorials & media remain preserved.
        subscription.grace_period_end = now
        logger.info(
            "subscription_entered_expired_read_only",
            extra={
                "subscription_id": str(subscription.id),
                "billing_account_id": str(subscription.billing_account_id),
                "rule": "Zero deletion - memorials preserved in read-only state",
            },
        )

    elif target_status == SubscriptionStatus.CANCELLED:
        subscription.cancelled_at = now
        subscription.cancel_at_period_end = True
        subscription.auto_renew = False

    elif target_status == SubscriptionStatus.TERMINATED:
        subscription.auto_renew = False

    # Apply target status
    subscription.status = target_status.value

    # Persist transition and log audit trail
    audit_service.record(
        db,
        action=AuditAction.SUBSCRIPTION_STATE_CHANGED,
        entity="subscription",
        entity_id=subscription.id,
        actor=None,
        actor_label=str(actor_id) if actor_id else "system",
        result=AuditResult.SUCCESS,
        detail={
            "from_status": old_status_val,
            "to_status": target_status.value,
            "reason": reason,
            "billing_account_id": str(subscription.billing_account_id),
        },
    )

    db.flush()
    return subscription
