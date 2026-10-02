"""Resolve a verified Firebase identity to a Pithros user row."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import record as audit_record
from app.auth.firebase import FirebaseIdentity
from app.core.enums import AuditAction, NotificationType
from app.core.errors import ForbiddenError
from app.notifications.service import notify
from app.users.models import User

logger = logging.getLogger(__name__)

_LAST_SEEN_REFRESH = timedelta(minutes=15)


def _find_by_uid(db: Session, uid: str, *, include_deleted: bool = False) -> User | None:
    stmt = select(User).where(User.firebase_uid == uid)
    if not include_deleted:
        stmt = stmt.where(User.deleted_at.is_(None))
    return db.scalar(stmt)


def _find_by_email(db: Session, email: str, *, include_deleted: bool = False) -> User | None:
    stmt = select(User).where(User.email == email)
    if not include_deleted:
        stmt = stmt.where(User.deleted_at.is_(None))
    return db.scalar(stmt)


def resolve_or_provision_user(db: Session, identity: FirebaseIdentity) -> User:
    """Return the Pithros user for a verified token, creating one on first sign-in.

    Role is never inferred from the email address. A new account starts as a
    visitor and is promoted only by an explicit domain action (creating a
    memorial makes you its steward) or by an administrator.
    """
    # Check for a soft-deleted account *before* anything else. Previously the
    # revoked row was found by uid, profile-synced, and only then rejected — and
    # the email-adoption path could re-bind `firebase_uid` onto a deleted row.
    # Doing this first means a deleted account is never mutated on the way to
    # being refused.
    deleted = _find_by_uid(db, identity.uid, include_deleted=True)
    if deleted is not None and deleted.deleted_at is not None:
        logger.warning("sign_in_attempt_deleted_account", extra={"user_id": str(deleted.id)})
        raise ForbiddenError("This account has been closed. Please contact support.")

    user = _find_by_uid(db, identity.uid)
    if user is None:
        user = _adopt_or_create(db, identity)
    else:
        _sync_profile(user, identity)

    if user.status != "active":
        raise ForbiddenError("This account is not active. Please contact support.")

    _touch_last_seen(user)
    db.flush()
    return user


def _adopt_or_create(db: Session, identity: FirebaseIdentity) -> User:
    email = identity.normalized_email

    # Adopt an existing row only when Firebase has proven the caller owns the
    # address. Adopting on an unverified email would let anyone claim another
    # person's account by signing up with their address.
    #
    # Soft-deleted rows are excluded: adopting one would hand a closed account's
    # history to a new signup.
    if email and identity.email_verified:
        existing = _find_by_email(db, email)
        if existing is not None:
            existing.firebase_uid = identity.uid
            _sync_profile(existing, identity)
            db.flush()
            logger.info("user_identity_linked", extra={"user_id": str(existing.id)})
            return existing

        # A closed account still holds this address, and `users.email` is unique —
        # so falling through would raise a constraint violation and a 500. Refusing
        # with an explanation is the honest outcome until account recovery exists.
        closed = _find_by_email(db, email, include_deleted=True)
        if closed is not None:
            logger.warning("signup_collided_with_closed_account", extra={"user_id": str(closed.id)})
            raise ForbiddenError(
                "This email address belongs to a closed account. Please contact support."
            )

    # A row with this email may still exist (a previous account lifecycle). It
    # cannot be duplicated (`users.email` is unique) and it must never be taken
    # over from an unverified identity — so refuse with a clear message instead
    # of colliding at the database. Once the email is verified, the adoption
    # path above links this Firebase identity to the existing account.
    if email:
        collision = _find_by_email(db, email, include_deleted=True)
        if collision is not None:
            if collision.deleted_at is not None:
                raise ForbiddenError(
                    "This email address belongs to a closed account. Please contact support."
                )
            raise ForbiddenError(
                "An account with this email already exists. Verify this email address, "
                "then sign in to continue."
            )

    user = User(
        firebase_uid=identity.uid,
        email=email or f"{identity.uid}@firebase.local",
        name=identity.display_name,
        role=identity.role or "visitor",
        admin_subrole=identity.admin_subrole,
        avatar=identity.picture,
        phone=identity.phone_number,
        email_verified=identity.email_verified,
        phone_verified=bool(identity.phone_number),
    )
    db.add(user)
    db.flush()
    audit_record(
        db,
        action=AuditAction.USER_REGISTERED,
        entity="user",
        entity_id=user.id,
        actor=user,
        actor_label="self-registration",
        detail={"provider": identity.sign_in_provider, "source": "first_login"},
    )
    notify(
        db,
        user_id=user.id,
        notification_type=NotificationType.WELCOME,
        title="Welcome to Pithros",
        body=(
            "Your account is ready. Create a memorial whenever you feel ready — "
            "you can add stories, photographs and family members gradually."
        ),
    )
    logger.info("user_provisioned", extra={"user_id": str(user.id)})
    return user


def _sync_profile(user: User, identity: FirebaseIdentity) -> None:
    email = identity.normalized_email or user.email
    if email != user.email:
        user.email = email
    if identity.name and identity.name.strip() and identity.name.strip() != user.name:
        user.name = identity.name.strip()
    if identity.picture and identity.picture != user.avatar:
        user.avatar = identity.picture
    if identity.phone_number and identity.phone_number != user.phone:
        user.phone = identity.phone_number
        user.phone_verified = True
    if identity.email_verified and not user.email_verified:
        user.email_verified = True
    # Role and admin_subrole are deliberately NOT re-synced from token claims here.
    # Firebase custom claims can lag a server-side demotion: an admin demoted in
    # Pithros would be silently re-promoted on their next request by a stale claim.
    # Authority lives in the database. Claims set the role only at provisioning
    # (a brand-new account), and later changes go through an explicit admin action.


def _touch_last_seen(user: User) -> None:
    now = datetime.now(UTC)
    if user.last_seen_at is None or (now - user.last_seen_at) > _LAST_SEEN_REFRESH:
        user.last_seen_at = now
