"""Account-deletion lifecycle service.

The rules that matter live here in one place:

* a request is only accepted with recent re-authentication and an explicit
  email confirmation;
* shared memorials survive — only the leaving steward's membership is removed,
  and a co-steward is promoted if the departing one was primary;
* a sole-steward memorial blocks execution until its disposition is chosen;
* execution anonymises the person, disables their Firebase identity, cancels
  future recurring billing, and never deletes another family's memorial.

Nothing here trusts the browser to decide that data is gone: the state machine
and the audit trail are written server-side.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import record as audit_record
from app.billing.models import BillingAccount, Subscription
from app.core.config import settings
from app.core.enums import (
    AuditAction,
    DeletionStatus,
    DispositionStatus,
    MemorialDisposition,
    NotificationType,
)
from app.core.errors import ConflictError, NotFoundError, UnauthorizedError, ValidationError
from app.memorials.cache import invalidate_public_memorial_cache
from app.memorials.models import Memorial, MemorialSteward
from app.notifications.service import notify
from app.privacy.models import AccountDeletionRequest, MemorialDispositionEntry
from app.privacy.schemas import (
    AdminDeletionRow,
    DeletionDispositionOut,
    DeletionRequestOut,
    DispositionUpdate,
)
from app.users.models import User

logger = logging.getLogger(__name__)

_OPEN_STATUSES = (
    DeletionStatus.REQUESTED.value,
    DeletionStatus.VERIFIED.value,
    DeletionStatus.SCHEDULED.value,
    DeletionStatus.BLOCKED_BY_DISPOSITION.value,
    DeletionStatus.EXECUTING.value,
)


def _now() -> datetime:
    return datetime.now(UTC)


def _assert_recent_auth(auth_time: int | float | None) -> None:
    window = settings.recent_reauth_window_minutes * 60
    if not auth_time:
        raise ValidationError(
            "Please confirm your identity again before deleting your account.",
            details={"reauthRequired": True},
        )
    age = _now().timestamp() - float(auth_time)
    if age > window:
        raise ValidationError(
            "Your sign-in is too old for this action. Please re-authenticate.",
            details={"reauthRequired": True},
        )


def _open_request(db: Session, user_id: uuid.UUID) -> AccountDeletionRequest | None:
    return (
        db.execute(
            select(AccountDeletionRequest)
            .where(
                AccountDeletionRequest.user_id == user_id,
                AccountDeletionRequest.status.in_(_OPEN_STATUSES),
            )
            .order_by(AccountDeletionRequest.created_at.desc())
        )
        .scalars()
        .first()
    )


def get_current(user: User, db: Session) -> DeletionRequestOut | None:
    request = _open_request(db, user.id)
    if request is None:
        return None
    return to_out(request)


def _sole_steward_memorials(db: Session, user: User) -> list[Memorial]:
    """Memorials that would be left without any steward if this user left."""
    memorials: list[Memorial] = []
    for stewardship in user.stewardships:
        memorial = stewardship.memorial
        if memorial is None or memorial.deleted_at is not None:
            continue
        if len(memorial.stewards) == 1:
            memorials.append(memorial)
    return memorials


def _cancel_recurring_billing(db: Session, user: User) -> list[Subscription]:
    """Stop future charges without punishing the current period."""
    account_ids = db.scalars(
        select(BillingAccount.id).where(BillingAccount.owner_user_id == user.id)
    ).all()
    if not account_ids:
        return []
    subscriptions = (
        db.execute(
            select(Subscription).where(
                Subscription.billing_account_id.in_(account_ids),
                Subscription.auto_renew.is_(True),
            )
        )
        .scalars()
        .all()
    )
    for subscription in subscriptions:
        subscription.auto_renew = False
        subscription.cancel_at_period_end = True
        audit_record(
            db,
            action=AuditAction.SUBSCRIPTION_CANCELLED,
            entity="subscription",
            entity_id=subscription.id,
            actor=user,
            detail={"reason": "account_deletion_requested"},
        )
    db.flush()
    return list(subscriptions)


def request_deletion(
    user: User,
    *,
    confirm_email: str,
    reason: str | None,
    auth_time: int | float | None,
    db: Session,
) -> DeletionRequestOut:
    if (confirm_email or "").strip().lower() != user.email.lower():
        raise ValidationError(
            "The confirmation email does not match your account.",
            details={"field": "confirmEmail"},
        )
    _assert_recent_auth(auth_time)

    if _open_request(db, user.id) is not None:
        raise ConflictError("A deletion request is already in progress for this account.")

    now = _now()
    request = AccountDeletionRequest(
        user_id=user.id,
        status=DeletionStatus.REQUESTED.value,
        reason=reason,
        requested_at=now,
    )
    db.add(request)
    db.flush()
    audit_record(
        db,
        action=AuditAction.USER_DELETION_REQUESTED,
        entity="account_deletion_request",
        entity_id=request.id,
        actor=user,
        detail={"reason": reason},
    )

    # A signed, recently re-authenticated request *is* the verification step.
    request.status = DeletionStatus.VERIFIED.value
    request.verified_at = now
    audit_record(
        db,
        action=AuditAction.USER_DELETION_VERIFIED,
        entity="account_deletion_request",
        entity_id=request.id,
        actor=user,
    )

    _cancel_recurring_billing(db, user)

    sole_steward_memorials = _sole_steward_memorials(db, user)
    for memorial in sole_steward_memorials:
        db.add(
            MemorialDispositionEntry(
                deletion_request_id=request.id,
                memorial_id=memorial.id,
                disposition=MemorialDisposition.ORPHAN.value,
                status=DispositionStatus.PENDING.value,
            )
        )

    if sole_steward_memorials:
        # The request is valid; it simply cannot proceed until the steward has
        # decided each memorial's fate. This is a resting state, not an error.
        request.status = DeletionStatus.BLOCKED_BY_DISPOSITION.value
    else:
        request.status = DeletionStatus.SCHEDULED.value
        request.scheduled_for = now + timedelta(days=settings.account_deletion_grace_days)

    notify(
        db,
        user_id=user.id,
        notification_type=NotificationType.ACCOUNT_DELETION_REQUESTED,
        title="Account deletion requested",
        body=(
            "We have received your request. You can cancel any time before the grace period ends."
        ),
        payload={
            "requestId": str(request.id),
            "scheduledFor": request.scheduled_for.isoformat() if request.scheduled_for else None,
            "blockedByDisposition": bool(sole_steward_memorials),
        },
    )

    db.commit()
    db.refresh(request)
    return to_out(request)


def cancel_deletion(user: User, db: Session) -> DeletionRequestOut:
    request = _open_request(db, user.id)
    if request is None:
        raise NotFoundError("No deletion request is in progress.")

    request.status = DeletionStatus.CANCELLED.value
    request.cancelled_at = _now()
    request.rejection_reason = "Cancelled by the account owner."
    request.scheduled_for = None
    for disposition in list(request.dispositions):
        if disposition.status == DispositionStatus.PENDING.value:
            db.delete(disposition)

    audit_record(
        db,
        action=AuditAction.USER_DELETION_CANCELLED,
        entity="account_deletion_request",
        entity_id=request.id,
        actor=user,
    )
    notify(
        db,
        user_id=user.id,
        notification_type=NotificationType.ACCOUNT_DELETION_CANCELLED,
        title="Account deletion cancelled",
        body="Your account will remain active. Nothing was deleted.",
        payload={"requestId": str(request.id)},
    )
    db.commit()
    db.refresh(request)
    return to_out(request)


def set_disposition(
    user: User, request_id: uuid.UUID, payload: DispositionUpdate, db: Session
) -> DeletionRequestOut:
    request = db.get(AccountDeletionRequest, request_id)
    if request is None or request.user_id != user.id:
        raise NotFoundError("Deletion request not found.")
    if request.status not in (
        DeletionStatus.BLOCKED_BY_DISPOSITION.value,
        DeletionStatus.SCHEDULED.value,
    ):
        raise ConflictError("This deletion request can no longer be changed.")

    entry = next(
        (item for item in request.dispositions if item.memorial_id == payload.memorial_id),
        None,
    )
    if entry is None:
        raise NotFoundError("That memorial is not awaiting a disposition.")
    if entry.status == DispositionStatus.COMPLETED.value:
        raise ConflictError("That memorial's disposition is already finalised.")

    try:
        choice = MemorialDisposition(payload.disposition)
    except ValueError as exc:
        raise ValidationError("Unknown disposition.") from exc

    memorial = entry.memorial
    now = _now()

    if choice == MemorialDisposition.TRANSFER:
        if not payload.successor_email:
            raise ValidationError("A successor email is required to transfer stewardship.")
        successor = db.execute(
            select(User).where(
                User.email == str(payload.successor_email).strip().lower(),
                User.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if successor is None or successor.id == user.id:
            # Requested, but not yet effective: a transfer only completes once a
            # real, authorised person can accept it. The request stays blocked.
            entry.successor_email = str(payload.successor_email).strip().lower()
            entry.disposition = choice.value
            db.commit()
            db.refresh(request)
            return to_out(request)
        _transfer_stewardship(db, memorial=memorial, from_user=user, to_user=successor, actor=user)
        entry.successor_email = successor.email
        entry.disposition = choice.value
        entry.status = DispositionStatus.COMPLETED.value
        entry.completed_at = now
    elif choice == MemorialDisposition.DELETE:
        _delete_memorial(db, memorial=memorial, actor=user)
        entry.disposition = choice.value
        entry.status = DispositionStatus.COMPLETED.value
        entry.completed_at = now
    else:  # ORPHAN — explicit restricted, system-owned state
        _orphan_memorial(db, memorial=memorial, from_user=user, actor=user)
        entry.disposition = choice.value
        entry.status = DispositionStatus.COMPLETED.value
        entry.completed_at = now

    db.flush()
    if all(item.status == DispositionStatus.COMPLETED.value for item in request.dispositions):
        request.status = DeletionStatus.SCHEDULED.value
        request.scheduled_for = now + timedelta(days=settings.account_deletion_grace_days)

    db.commit()
    db.refresh(request)
    return to_out(request)


def _remove_stewardship(db: Session, *, memorial: Memorial, user: User) -> bool:
    """Remove `user` from `memorial`, promoting a co-steward if they were primary.

    Returning the primary flag is done in two flushes so the partial unique index
    (one primary per memorial) is never transiently violated.
    """
    row = next((s for s in memorial.stewards if s.user_id == user.id), None)
    if row is None:
        return False
    remaining = [s for s in memorial.stewards if s.user_id != user.id]
    if row.is_primary and remaining:
        row.is_primary = False
        db.flush()
        remaining[0].is_primary = True
        db.flush()
    db.delete(row)
    db.flush()
    return True


def _transfer_stewardship(
    db: Session, *, memorial: Memorial, from_user: User, to_user: User, actor: User
) -> None:
    already = any(steward.user_id == to_user.id for steward in memorial.stewards)
    _remove_stewardship(db, memorial=memorial, user=from_user)
    if not already:
        db.add(MemorialSteward(memorial_id=memorial.id, user_id=to_user.id, is_primary=True))
        db.flush()
    audit_record(
        db,
        action=AuditAction.MEMORIAL_TRANSFERRED,
        entity="memorial",
        entity_id=memorial.id,
        actor=actor,
        detail={"to_user_id": str(to_user.id), "reason": "account_deletion"},
    )
    invalidate_public_memorial_cache(memorial.slug)


def _delete_memorial(db: Session, *, memorial: Memorial, actor: User) -> None:
    memorial.deleted_at = _now()
    memorial.search_index_enabled = False
    for steward in list(memorial.stewards):
        db.delete(steward)
    audit_record(
        db,
        action=AuditAction.MEMORIAL_DELETED,
        entity="memorial",
        entity_id=memorial.id,
        actor=actor,
        detail={"slug": memorial.slug, "reason": "account_deletion"},
    )
    invalidate_public_memorial_cache(memorial.slug)


def _orphan_memorial(db: Session, *, memorial: Memorial, from_user: User, actor: User) -> None:
    """Restricted, system-owned state: nothing new is published, nothing is lost.

    The memorial leaves discovery and becomes private; the departing steward is
    removed without inferring a new owner, and a future authorised claimant can
    still request stewardship.
    """
    from app.core.enums import PrivacyLevel, PublicationState

    memorial.publication_state = PublicationState.ARCHIVED.value
    memorial.privacy = PrivacyLevel.PRIVATE.value
    memorial.search_index_enabled = False
    _remove_stewardship(db, memorial=memorial, user=from_user)
    audit_record(
        db,
        action=AuditAction.MEMORIAL_UPDATED,
        entity="memorial",
        entity_id=memorial.id,
        actor=actor,
        detail={"orphaned": True, "reason": "account_deletion"},
    )
    invalidate_public_memorial_cache(memorial.slug)


def _disable_firebase(uid: str) -> bool:
    try:
        from app.auth.firebase import disable_firebase_user, revoke_firebase_tokens

        revoke_firebase_tokens(uid)
        disable_firebase_user(uid)
        return True
    except UnauthorizedError:
        logger.warning("firebase_disable_skipped_not_configured")
        return False
    except Exception:
        logger.exception("firebase_disable_failed")
        return False


def execute_request(db: Session, request: AccountDeletionRequest) -> AccountDeletionRequest:
    """Erase the account. Idempotent; safe to run again after a crash."""
    if request.status == DeletionStatus.COMPLETED.value:
        return request
    if request.status not in (
        DeletionStatus.SCHEDULED.value,
        DeletionStatus.BLOCKED_BY_DISPOSITION.value,
        DeletionStatus.EXECUTING.value,
    ):
        return request
    if any(item.status != DispositionStatus.COMPLETED.value for item in request.dispositions):
        request.status = DeletionStatus.BLOCKED_BY_DISPOSITION.value
        db.commit()
        return request

    user = db.get(User, request.user_id)
    if user is None:
        request.status = DeletionStatus.COMPLETED.value
        request.executed_at = _now()
        db.commit()
        return request

    request.status = DeletionStatus.EXECUTING.value
    db.flush()

    # Shared memorials survive: drop only this steward's membership.
    for stewardship in list(user.stewardships):
        memorial = stewardship.memorial
        if memorial is None:
            db.delete(stewardship)
        elif memorial.deleted_at is not None or len(memorial.stewards) > 1:
            _remove_stewardship(db, memorial=memorial, user=user)

    firebase_disabled = _disable_firebase(user.firebase_uid)

    # Erase directly identifying fields. The row remains as an opaque tombstone so
    # audit rows and shared content keep referential integrity.
    user.email = f"deleted+{user.id}@pithros.invalid"
    user.name = "Deleted Account"
    user.phone = None
    user.avatar = None
    user.firebase_uid = f"deleted:{user.id}"
    user.email_verified = False
    user.phone_verified = False
    user.last_seen_at = None
    user.deleted_at = _now()
    db.flush()

    audit_record(
        db,
        action=AuditAction.USER_DELETION_EXECUTED,
        entity="account_deletion_request",
        entity_id=request.id,
        actor=None,
        actor_label="deleted-account",
        detail={"firebaseDisabled": firebase_disabled, "userId": str(user.id)},
    )
    request.status = DeletionStatus.COMPLETED.value
    request.executed_at = _now()
    db.commit()
    db.refresh(request)
    return request


def execute_due(db: Session) -> list[AccountDeletionRequest]:
    now = _now()
    due = (
        db.execute(
            select(AccountDeletionRequest).where(
                AccountDeletionRequest.status == DeletionStatus.SCHEDULED.value,
                AccountDeletionRequest.scheduled_for.is_not(None),
                AccountDeletionRequest.scheduled_for <= now,
            )
        )
        .scalars()
        .all()
    )
    return [execute_request(db, request) for request in due]


def admin_list(db: Session) -> list[AdminDeletionRow]:
    rows = db.execute(
        select(AccountDeletionRequest, User)
        .join(User, User.id == AccountDeletionRequest.user_id)
        .order_by(AccountDeletionRequest.created_at.desc())
    ).all()
    return [
        AdminDeletionRow(
            id=str(request.id),
            user_id=str(user.id),
            user_email=user.email,
            status=request.status,
            requested_at=request.requested_at,
            scheduled_for=request.scheduled_for,
            executed_at=request.executed_at,
            disposition_count=len(request.dispositions),
        )
        for request, user in rows
    ]


def to_out(request: AccountDeletionRequest) -> DeletionRequestOut:
    return DeletionRequestOut(
        id=str(request.id),
        status=request.status,
        reason=request.reason,
        requested_at=request.requested_at,
        verified_at=request.verified_at,
        scheduled_for=request.scheduled_for,
        executed_at=request.executed_at,
        cancelled_at=request.cancelled_at,
        rejection_reason=request.rejection_reason,
        dispositions=[
            DeletionDispositionOut(
                id=str(entry.id),
                memorial_id=str(entry.memorial_id),
                memorial_name=entry.memorial.full_name if entry.memorial else "Memorial",
                memorial_slug=entry.memorial.slug if entry.memorial else "",
                disposition=entry.disposition,
                status=entry.status,
                successor_email=entry.successor_email,
                completed_at=entry.completed_at,
            )
            for entry in request.dispositions
        ],
    )
