"""Object-level authorization for memorials.

Every read and write of a memorial passes through an access resolution here. A
route declares the permission it needs and physically cannot obtain the memorial
without satisfying it — the UI is never the enforcement point.

Two rules matter more than the rest:

1. Effective permissions require *membership*. A stale permission-grant row left
   behind after a contributor is revoked must not keep granting access.
2. A caller who is not allowed to see a memorial gets 404, never 403, so the
   platform cannot be used to enumerate private memorials.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from dataclasses import dataclass, field

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.audit.service import record_independently
from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.enums import (
    AuditAction,
    AuditResult,
    ContributorRole,
    ContributorStatus,
    MemorialPermission,
    PrivacyLevel,
)
from app.core.errors import ForbiddenError, NotFoundError
from app.memorials.models import Memorial
from app.memorials.repository import get_by_id
from app.users.models import User

ALL_PERMISSIONS: frozenset[MemorialPermission] = frozenset(MemorialPermission)

ROLE_PERMISSIONS: dict[str, frozenset[MemorialPermission]] = {
    ContributorRole.STEWARD.value: ALL_PERMISSIONS,
    ContributorRole.BIOGRAPHER.value: frozenset(
        {
            MemorialPermission.VIEW,
            MemorialPermission.EDIT_STORY,
            MemorialPermission.MANAGE_TIMELINE,
        }
    ),
    ContributorRole.PHOTO_ARCHIVIST.value: frozenset(
        {
            MemorialPermission.VIEW,
            MemorialPermission.MANAGE_MEDIA,
        }
    ),
    # Submitting a memory to a memorial you belong to is allowed for any member
    # and is gated by tribute moderation rather than by a permission bit.
    ContributorRole.MEMORY_CONTRIBUTOR.value: frozenset({MemorialPermission.VIEW}),
    ContributorRole.GUEST_REVIEWER.value: frozenset({MemorialPermission.VIEW}),
    ContributorRole.VIEWER.value: frozenset({MemorialPermission.VIEW}),
}

# Privacy levels an anonymous or non-member visitor may read.
EXTERNALLY_VISIBLE_PRIVACY = frozenset({PrivacyLevel.PUBLIC.value, PrivacyLevel.UNLISTED.value})


@dataclass
class MemorialAccess:
    memorial: Memorial
    user: User | None
    role: str | None = None
    is_steward: bool = False
    is_primary_steward: bool = False
    permissions: frozenset[MemorialPermission] = field(default_factory=frozenset)

    @property
    def is_authenticated(self) -> bool:
        return self.user is not None

    @property
    def is_member(self) -> bool:
        return self.is_steward or self.role is not None

    def has(self, permission: MemorialPermission) -> bool:
        return permission in self.permissions


def resolve_access(db: Session, memorial: Memorial, user: User | None) -> MemorialAccess:
    """Compute a user's effective role and permissions on one memorial."""
    if user is None:
        return MemorialAccess(memorial=memorial, user=None)

    permissions: set[MemorialPermission] = set()
    role: str | None = None
    is_steward = False
    is_primary_steward = False

    for steward in memorial.stewards:
        if steward.user_id == user.id:
            is_steward = True
            is_primary_steward = steward.is_primary
            role = ContributorRole.STEWARD.value
            permissions |= ROLE_PERMISSIONS[ContributorRole.STEWARD.value]
            break

    if not is_steward:
        for contributor in memorial.contributors:
            if contributor.user_id != user.id:
                continue
            if contributor.status != ContributorStatus.ACTIVE.value:
                break
            role = contributor.role
            permissions |= ROLE_PERMISSIONS.get(contributor.role, frozenset())
            break

    # Explicit grants only take effect while the holder is still a member, so
    # revoking a contributor immediately revokes their extra permissions too.
    if is_steward or role is not None:
        for grant in memorial.permission_grants:
            if grant.user_id == user.id:
                try:
                    permissions.add(MemorialPermission(grant.permission))
                except ValueError:
                    continue

    return MemorialAccess(
        memorial=memorial,
        user=user,
        role=role,
        is_steward=is_steward,
        is_primary_steward=is_primary_steward,
        permissions=frozenset(permissions),
    )


def can_view_memorial(access: MemorialAccess) -> bool:
    if not access.memorial.is_published:
        return access.is_member
    if access.is_member:
        return True
    return access.memorial.privacy in EXTERNALLY_VISIBLE_PRIVACY


def can_edit_memorial(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.EDIT_DETAILS)


def can_manage_privacy(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.MANAGE_PRIVACY)


def can_upload_media(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.MANAGE_MEDIA)


def can_manage_contributors(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.MANAGE_CONTRIBUTORS)


def can_submit_verification(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.SUBMIT_VERIFICATION)


def can_delete_memorial(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.DELETE)


def can_change_theme(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.CHANGE_THEME)


def can_transfer_stewardship(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.TRANSFER_STEWARDSHIP)


def can_publish(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.PUBLISH)


def can_manage_timeline(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.MANAGE_TIMELINE)


def can_edit_story(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.EDIT_STORY)


def can_manage_tributes(access: MemorialAccess) -> bool:
    return access.has(MemorialPermission.MANAGE_TRIBUTES)


# Which permission each updatable field requires. The general PATCH endpoint
# accepts a partial update, so the fields actually present in the body decide
# whether the caller is allowed — a biographer may change the story but not the
# name, and nobody may change privacy without the management permission.
FIELD_PERMISSIONS: dict[str, MemorialPermission] = {
    "full_name": MemorialPermission.EDIT_DETAILS,
    "preferred_name": MemorialPermission.EDIT_DETAILS,
    "birth_date": MemorialPermission.EDIT_DETAILS,
    "death_date": MemorialPermission.EDIT_DETAILS,
    "birth_place": MemorialPermission.EDIT_DETAILS,
    "resting_place": MemorialPermission.EDIT_DETAILS,
    "short_epitaph": MemorialPermission.EDIT_DETAILS,
    "portrait_url": MemorialPermission.EDIT_DETAILS,
    "cover_url": MemorialPermission.EDIT_DETAILS,
    "story": MemorialPermission.EDIT_STORY,
    "privacy": MemorialPermission.MANAGE_PRIVACY,
    "theme": MemorialPermission.CHANGE_THEME,
}


def required_permission_for(field: str) -> MemorialPermission:
    return FIELD_PERMISSIONS.get(field, MemorialPermission.EDIT_DETAILS)


def ensure_can_update(access: MemorialAccess, fields: set[str]) -> None:
    """Refuse an update unless the caller holds every permission the fields need."""
    missing = sorted(field for field in fields if not access.has(required_permission_for(field)))
    if not missing:
        return

    # This is the escalation-attempt signal: a *member* reaching for a field their
    # role does not cover (a biographer trying to rename the memorial, say). The
    # route-level dependency cannot see it, because which permission is required
    # depends on the request body.
    record_independently(
        action=AuditAction.AUTHORIZATION_DENIED,
        entity="memorial",
        entity_id=access.memorial.id,
        actor=access.user,
        result=AuditResult.DENIED,
        detail={"deniedFields": missing, "role": access.role},
    )

    raise ForbiddenError("You do not have permission to change: " + ", ".join(missing) + ".")


def authorized(permission: MemorialPermission) -> Callable[..., Memorial]:
    """Build a dependency that loads a memorial and proves the caller may act on it.

    Usage:

        @router.patch("/{memorial_id}")
        def update(memorial: Memorial = Depends(authorized(MemorialPermission.EDIT_DETAILS))):
            ...

    The route cannot reach its body without the check having passed.
    """

    def dependency(
        memorial_id: uuid.UUID,
        request: Request,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Memorial:
        memorial = get_by_id(db, memorial_id)
        if memorial is None:
            raise NotFoundError("Memorial not found")

        access = resolve_access(db, memorial, user)

        if not access.has(permission):
            may_view = can_view_memorial(access)

            # Recorded on its own transaction: this request is about to fail, so a
            # row written here would roll back with it. Refusals are the signal
            # worth keeping — they are how probing for other people's memorials
            # becomes visible.
            record_independently(
                action=AuditAction.AUTHORIZATION_DENIED,
                entity="memorial",
                entity_id=memorial.id,
                actor=user,
                result=AuditResult.DENIED,
                detail={
                    "permission": permission.value,
                    "role": access.role,
                    "privacy": memorial.privacy,
                    "publicationState": memorial.publication_state,
                    "revealedExistence": may_view,
                },
                request=request,
            )

            # Distinguish "you may not do this" from "this does not exist for you".
            if not may_view:
                raise NotFoundError("Memorial not found")
            raise ForbiddenError("You do not have permission to perform this action.")

        return memorial

    dependency.__name__ = f"authorized_{permission.value}"
    return dependency
