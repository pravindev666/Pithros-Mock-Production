"""Public visibility for portraits, covers, and photographs.

Covers the promotion workflow (copy into the public bucket on request) and the
portrait/cover media references. The invariant under test: anonymous read models
never expose bytes that have not been deliberately promoted, and a reference can
only point at a photo that belongs to the memorial and is fully uploaded.
"""

from __future__ import annotations

import pytest

from app.core.config import settings

JPEG_HEADER = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01"


def _upload(client, headers, memorial_id, *, filename, content_type, kind, head):
    intent = client.post(
        f"/api/v1/memorials/{memorial_id}/media/upload-intent",
        json={
            "filename": filename,
            "contentType": content_type,
            "sizeBytes": 2048,
            "kind": kind,
        },
        headers=headers,
    )
    assert intent.status_code == 201, intent.text
    body = intent.json()

    marker = f"{settings.api_v1_prefix}/storage/local"
    upload_path = body["uploadUrl"][body["uploadUrl"].find(marker) :]
    put = client.put(upload_path, content=head, headers={"Content-Type": content_type})
    assert put.status_code == 204

    complete = client.post(
        f"/api/v1/memorials/{memorial_id}/media/{body['mediaId']}/complete", headers=headers
    )
    assert complete.status_code == 200, complete.text
    return body["mediaId"]


def _upload_photo(client, headers, memorial_id, *, filename="photo.jpg"):
    return _upload(
        client,
        headers,
        memorial_id,
        filename=filename,
        content_type="image/jpeg",
        kind="photo",
        head=JPEG_HEADER + b"\x00" * 512,
    )


def _set_privacy(client, headers, memorial_id, media_id, privacy):
    return client.patch(
        f"/api/v1/memorials/{memorial_id}/media/{media_id}",
        json={"privacy": privacy},
        headers=headers,
    )


def test_photo_promotion_moves_bytes_to_public_bucket(
    client, make_user, make_memorial, auth, db_session
):
    from sqlalchemy import select

    from app.core.enums import StorageTier
    from app.core.errors import StorageError
    from app.media.models import MediaItem
    from app.media.storage import get_storage

    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)
    media_id = _upload_photo(client, headers, memorial.id)

    promoted = _set_privacy(client, headers, memorial.id, media_id, "public")
    assert promoted.status_code == 200
    assert promoted.json()["isPublic"] is True

    item = db_session.scalar(select(MediaItem).where(MediaItem.id == media_id))
    assert item is not None
    assert item.storage_tier == StorageTier.PUBLIC.value
    storage_key = item.storage_key

    storage = get_storage()
    assert storage.head(tier=StorageTier.PUBLIC, key=storage_key).size > 0

    demoted = _set_privacy(client, headers, memorial.id, media_id, "private")
    assert demoted.status_code == 200
    assert demoted.json()["isPublic"] is False

    db_session.refresh(item)
    assert item.storage_tier == StorageTier.PRIVATE.value
    assert storage.head(tier=StorageTier.PRIVATE, key=storage_key).size > 0
    with pytest.raises(StorageError):
        storage.head(tier=StorageTier.PUBLIC, key=storage_key)


def test_verification_document_can_never_be_promoted(
    client, make_user, make_memorial, auth, db_session
):
    from sqlalchemy import select

    from app.media.models import MediaItem

    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    document_id = _upload(
        client,
        headers,
        memorial.id,
        filename="certificate.pdf",
        content_type="application/pdf",
        kind="document",
        head=b"%PDF-1.4\n" + b"\x00" * 512,
    )

    refused = _set_privacy(client, headers, memorial.id, document_id, "public")
    assert refused.status_code == 422

    item = db_session.scalar(select(MediaItem).where(MediaItem.id == document_id))
    assert item is not None
    assert item.storage_tier == "sensitive"
    assert item.privacy != "public"


def test_public_memorial_shows_only_promoted_photos(client, make_user, make_memorial, auth):
    from app.core.enums import PrivacyLevel, PublicationState

    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    headers = auth(owner)

    family_photo = _upload_photo(client, headers, memorial.id, filename="family.jpg")
    public_photo = _upload_photo(client, headers, memorial.id, filename="public.jpg")

    assert _set_privacy(client, headers, memorial.id, public_photo, "public").status_code == 200

    anonymous = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert anonymous.status_code == 200
    media = anonymous.json()["media"]
    assert [m["id"] for m in media] == [public_photo]
    assert media[0]["isPublic"] is True
    assert media[0]["url"]
    assert family_photo not in [m["id"] for m in media]


def test_portrait_reference_resolves_for_members_and_follows_promotion(
    client, make_user, make_memorial, auth
):
    from app.core.enums import PrivacyLevel, PublicationState

    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.PUBLISHED.value,
    )
    headers = auth(owner)
    media_id = _upload_photo(client, headers, memorial.id, filename="portrait.jpg")

    bound = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"portraitMediaId": media_id},
        headers=headers,
    )
    assert bound.status_code == 200
    assert bound.json()["portraitUrl"]

    # Anonymous viewers only see it after the photograph itself is promoted.
    before = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert before.status_code == 200
    assert not before.json()["portraitUrl"]

    assert _set_privacy(client, headers, memorial.id, media_id, "public").status_code == 200
    after = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert after.status_code == 200
    assert after.json()["portraitUrl"]

    cleared = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"portraitMediaId": None},
        headers=headers,
    )
    assert cleared.status_code == 200
    assert not cleared.json()["portraitUrl"]


def test_portrait_reference_rejects_foreign_and_invalid_media(
    client, make_user, make_memorial, auth
):
    owner = make_user(name="Owner")
    other = make_user(name="Other")
    memorial = make_memorial(steward=owner)
    other_memorial = make_memorial(steward=other)
    headers = auth(owner)

    # A photo that belongs to a different family's memorial is invisible here.
    foreign_media = _upload_photo(client, auth(other), other_memorial.id, filename="foreign.jpg")
    refused = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"portraitMediaId": foreign_media},
        headers=headers,
    )
    assert refused.status_code == 404

    # A verification document is not a portrait.
    document_id = _upload(
        client,
        headers,
        memorial.id,
        filename="certificate.pdf",
        content_type="application/pdf",
        kind="document",
        head=b"%PDF-1.4\n" + b"\x00" * 512,
    )
    refused_document = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"portraitMediaId": document_id},
        headers=headers,
    )
    assert refused_document.status_code == 422

    # An upload that never completed cannot become the portrait.
    pending = client.post(
        f"/api/v1/memorials/{memorial.id}/media/upload-intent",
        json={
            "filename": "pending.jpg",
            "contentType": "image/jpeg",
            "sizeBytes": 2048,
            "kind": "photo",
        },
        headers=headers,
    )
    refused_pending = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"portraitMediaId": pending.json()["mediaId"]},
        headers=headers,
    )
    assert refused_pending.status_code == 409
