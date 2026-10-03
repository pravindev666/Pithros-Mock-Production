"""Regression tests for bugs found during the production-readiness audit.

Each of these was a real latent defect, not a hypothetical. They are kept small
and specific so a future refactor cannot quietly reintroduce them.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.core.errors import ForbiddenError


def test_a_closed_account_cannot_re_enter_and_is_not_mutated(client, make_user, auth, db_session):
    """`_adopt_or_create` used to adopt a soft-deleted row and re-bind
    `firebase_uid` to the new signup before the deleted check ran.

    A closed account must be refused *without being touched on the way*.
    """
    user = make_user(name="Closed Account", email="closed@example.com")
    original_uid = user.firebase_uid

    db_session.add(user)
    user.deleted_at = datetime.now(UTC)
    db_session.commit()

    response = client.get("/api/v1/me", headers=auth(user))

    assert response.status_code == 403

    db_session.refresh(user)
    assert user.deleted_at is not None, "the closed account was resurrected"
    assert user.firebase_uid == original_uid, "firebase_uid was re-bound to a new signup"


def test_a_closed_accounts_email_is_not_adopted(client, make_user, db_session):
    """Signing up with a closed account's address must not inherit their history.

    Adoption would hand a closed account's memorials to a stranger. The address is
    still held by the unique index, so the honest outcome is a refusal with an
    explanation — not a constraint violation surfaced as a 500, and certainly not
    silent inheritance.
    """
    from app.auth.firebase import FirebaseIdentity
    from app.auth.service import resolve_or_provision_user

    victim = make_user(name="Original Owner", email="reused@example.com")
    victim.deleted_at = datetime.now(UTC)
    db_session.commit()

    identity = FirebaseIdentity(
        uid="uid_brand_new_person",
        email="reused@example.com",
        email_verified=True,
        name="Someone New",
    )

    with pytest.raises(ForbiddenError):
        resolve_or_provision_user(db_session, identity)

    db_session.refresh(victim)
    assert victim.deleted_at is not None
    assert victim.name == "Original Owner", "the closed account was mutated"


def test_soft_deleted_memorials_are_absent_from_every_public_surface(
    client, make_user, make_memorial, auth
):
    """Soft delete must remove a memorial from discovery, not just from the dashboard."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public", full_name="Soon Deleted")
    headers = auth(owner)

    assert client.get(f"/api/v1/public/memorials/{memorial.slug}").status_code == 200

    assert client.delete(f"/api/v1/memorials/{memorial.id}", headers=headers).status_code == 204

    assert client.get(f"/api/v1/public/memorials/{memorial.slug}").status_code == 404

    results = client.get("/api/v1/public/search").json()["results"]
    assert memorial.slug not in {item["slug"] for item in results}

    assert client.get("/api/v1/me/memorials", headers=headers).json() == []


def test_media_worker_ignores_a_soft_deleted_row(db_session, make_user, make_memorial):
    """`process_uploaded_media` selected by id with no deleted_at filter, so a row
    deleted between upload and processing still got thumbnailed."""
    from sqlalchemy import select

    from app.core.enums import MediaStatus, StorageTier
    from app.media.models import MediaItem

    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    item = MediaItem(
        memorial_id=memorial.id,
        kind="photo",
        status=MediaStatus.READY.value,
        privacy="private",
        storage_tier=StorageTier.PRIVATE.value,
        storage_bucket="pithros-private",
        storage_key="memorials/x/photo/soft-deleted.jpg",
        original_filename="soft-deleted.jpg",
        mime_type="image/jpeg",
        uploaded_by_id=owner.id,
    )
    db_session.add(item)
    db_session.commit()

    item.deleted_at = datetime.now(UTC)
    db_session.commit()

    found = db_session.scalar(
        select(MediaItem).where(
            MediaItem.id == item.id,
            MediaItem.deleted_at.is_(None),
        )
    )

    assert found is None, "the worker would still have processed this row"


def test_a_pending_upload_does_not_consume_the_photo_limit(
    db_session, make_user, make_memorial
):
    """The usage counter counted PENDING rows, so the last allowed free photo was
    rejected at `/complete` — after its bytes had already reached storage — because
    the upload's own pending row pushed the count over the limit.
    """
    from sqlalchemy import select

    from app.billing.entitlements import assert_can_upload_media
    from app.core.enums import MediaKind, MediaStatus
    from app.media.models import MediaItem

    user = make_user()
    memorial = make_memorial(steward=user, full_name="Pending Limit", premium=False)

    def add(status: str, index: int) -> None:
        db_session.add(
            MediaItem(
                memorial_id=memorial.id,
                kind=MediaKind.PHOTO.value,
                status=status,
                privacy="private",
                storage_tier="private",
                storage_bucket="pithros-private",
                storage_key=f"memorials/{memorial.id}/photo_{index}.jpg",
                original_filename=f"photo_{index}.jpg",
                mime_type="image/jpeg",
                size_bytes=1024,
                uploaded_by_id=user.id,
            )
        )

    # Two finished photographs, plus the third still in flight.
    add(MediaStatus.READY.value, 0)
    add(MediaStatus.READY.value, 1)
    add(MediaStatus.PENDING.value, 2)
    db_session.flush()

    allowed, reason = assert_can_upload_media(memorial.id, MediaKind.PHOTO, 1024, db_session)
    assert allowed is True, reason

    # Once all three are ready, the fourth is correctly refused.
    pending = db_session.scalar(
        select(MediaItem).where(
            MediaItem.memorial_id == memorial.id,
            MediaItem.status == MediaStatus.PENDING.value,
        )
    )
    pending.status = MediaStatus.READY.value
    db_session.flush()

    refused, message = assert_can_upload_media(memorial.id, MediaKind.PHOTO, 1024, db_session)
    assert refused is False
    assert "Free Memorial includes 3 photographs" in message


def test_unhandled_errors_still_return_the_error_envelope(client):
    """A plain exception used to escape the handlers and return Starlette's bare
    'Internal Server Error', which the frontend cannot parse."""
    from app.main import app as fastapi_app

    @fastapi_app.get("/__boom", include_in_schema=False)
    def _boom():  # pragma: no cover - deliberately raises
        raise RuntimeError("kaboom")

    try:
        response = client.get("/__boom")
        assert response.status_code == 500
        body = response.json()
        assert body["error"]["code"] == "internal_error"
        assert "requestId" in body["error"]
    finally:
        fastapi_app.router.routes = [
            route
            for route in fastapi_app.router.routes
            if getattr(route, "path", None) != "/__boom"
        ]
