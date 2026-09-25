"""Resolve a verified Firebase identity to a Pithros user row."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import record as audit_record
from app.auth.firebase import FirebaseIdentity
from app.core.enums import AuditAction
from app.core.errors import ForbiddenError
from app.users.models import User

logger = logging.getLogger(__name__)

_LAST_SEEN_REFRESH = timedelta(minutes=15)


def _find_by_uid(db: Session, uid: str) -> User | None:
    return db.scalar(select(User).where(User.firebase_uid == uid))


def _find_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def resolve_or_provision_user(db: Session, identity: FirebaseIdentity) -> User:
    """Return the Pithros user for a verified token, creating one on first sign-in.

    Role is never inferred from the email address. A new account starts as a
    visitor and is promoted only by an explicit domain action (creating a
    memorial makes you its steward) or by an administrator.
    """
    user = _find_by_uid(db, identity.uid)

    if user is None:
        user = _adopt_or_create(db, identity)
    else:
        _sync_profile(user, identity)

    if user.status != "active" or user.deleted_at is not None:
        raise ForbiddenError("This account is not active. Please contact support.")

    _touch_last_seen(user)
    db.flush()
    return user


def _adopt_or_create(db: Session, identity: FirebaseIdentity) -> User:
    email = identity.normalized_email

    # Adopt an existing row only when Firebase has proven the caller owns the
    # address. Adopting on an unverified email would let anyone claim another
    # person's account by signing up with their address.
    if email and identity.email_verified:
        existing = _find_by_email(db, email)
        if existing is not None:
            existing.firebase_uid = identity.uid
            _sync_profile(existing, identity)
            db.flush()
            logger.info("user_identity_linked", extra={"user_id": str(existing.id)})
            return existing

    user = User(
        firebase_uid=identity.uid,
        email=email or f"{identity.uid}@firebase.local",
        name=identity.display_name,
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


def _touch_last_seen(user: User) -> None:
    now = datetime.now(UTC)
    if user.last_seen_at is None or (now - user.last_seen_at) > _LAST_SEEN_REFRESH:
        user.last_seen_at = now
