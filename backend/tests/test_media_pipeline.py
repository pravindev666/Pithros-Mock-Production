"""The media upload pipeline, end to end.

Exercises the real flow — authorize, mint an upload URL, PUT the bytes, confirm,
validate the stored content — rather than mocking storage. Validation is the part
worth testing: the declared content type is attacker-controlled, so the server
re-inspects the actual bytes.
"""

from __future__ import annotations

from app.core.config import settings

JPEG_HEADER = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01"
PNG_HEADER = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"


def _upload_url_to_path(upload_url: str) -> str:
    """Strip the origin so the TestClient can call the URL the API returned."""
    marker = f"{settings.api_v1_prefix}/storage/local"
    index = upload_url.find(marker)
    assert index != -1, f"unexpected upload URL: {upload_url}"
    return upload_url[index:]


def _intent(client, auth_header, memorial_id, *, filename, content_type, kind="photo"):
    return client.post(
        f"/api/v1/memorials/{memorial_id}/media/upload-intent",
        json={
            "filename": filename,
            "contentType": content_type,
            "sizeBytes": 2048,
            "kind": kind,
        },
        headers=auth_header,
    )


def test_full_upload_pipeline_creates_a_ready_media_record(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    intent = _intent(
        client, headers, memorial.id, filename="portrait.jpg", content_type="image/jpeg"
    )
    assert intent.status_code == 201

    body = intent.json()
    media_id = body["mediaId"]
    upload_path = _upload_url_to_path(body["uploadUrl"])

    # The client PUTs the bytes straight to storage; FastAPI is not in the path.
    payload = JPEG_HEADER + b"\x00" * 512
    put = client.put(
        upload_path,
        content=payload,
        headers={"Content-Type": "image/jpeg"},
    )
    assert put.status_code == 204

    complete = client.post(
        f"/api/v1/memorials/{memorial.id}/media/{media_id}/complete", headers=headers
    )
    assert complete.status_code == 200

    confirmed = complete.json()
    assert confirmed["status"] == "ready"
    assert confirmed["kind"] == "photo"
    assert confirmed["sizeBytes"] == len(payload)

    listed = client.get(f"/api/v1/memorials/{memorial.id}/media", headers=headers).json()
    assert len(listed) == 1
    assert listed[0]["id"] == media_id
    assert listed[0]["isPrivate"] is True


def test_content_that_does_not_match_its_extension_is_rejected(
    client, make_user, make_memorial, auth
):
    """A file named .jpg whose bytes are a PNG must not be accepted as a JPEG."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    intent = _intent(client, headers, memorial.id, filename="photo.jpg", content_type="image/jpeg")
    upload_path = _upload_url_to_path(intent.json()["uploadUrl"])
    media_id = intent.json()["mediaId"]

    client.put(
        upload_path, content=PNG_HEADER + b"\x00" * 256, headers={"Content-Type": "image/jpeg"}
    )

    complete = client.post(
        f"/api/v1/memorials/{memorial.id}/media/{media_id}/complete", headers=headers
    )

    assert complete.status_code == 422


def test_an_executable_disguised_as_an_image_is_rejected(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    intent = _intent(
        client, headers, memorial.id, filename="innocent.jpg", content_type="image/jpeg"
    )
    upload_path = _upload_url_to_path(intent.json()["uploadUrl"])
    media_id = intent.json()["mediaId"]

    # Windows PE header, with a .jpg extension and an image/jpeg content type.
    client.put(
        upload_path, content=b"MZ\x90\x00" + b"\x00" * 512, headers={"Content-Type": "image/jpeg"}
    )

    complete = client.post(
        f"/api/v1/memorials/{memorial.id}/media/{media_id}/complete", headers=headers
    )

    assert complete.status_code == 422


def test_document_uploads_land_in_the_sensitive_tier(
    client, make_user, make_memorial, auth, db_session
):
    """Verification documents must not share a bucket with family photographs."""
    from sqlalchemy import select

    from app.media.models import MediaItem

    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    intent = _intent(
        client,
        headers,
        memorial.id,
        filename="certificate.pdf",
        content_type="application/pdf",
        kind="document",
    )
    assert intent.status_code == 201

    item = db_session.scalar(select(MediaItem).where(MediaItem.id == intent.json()["mediaId"]))
    assert item is not None
    assert item.storage_tier == "sensitive"
    assert item.storage_bucket == settings.r2_bucket_sensitive


def test_upload_url_never_discloses_the_storage_key(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    body = _intent(
        client, auth(owner), memorial.id, filename="a.png", content_type="image/png"
    ).json()

    assert "storageKey" not in body
    assert "storageBucket" not in body
    assert memorial.slug not in body["uploadUrl"] or "storage/local" in body["uploadUrl"]


def test_confirmed_media_can_be_removed(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    intent = _intent(client, headers, memorial.id, filename="b.jpg", content_type="image/jpeg")
    client.put(
        _upload_url_to_path(intent.json()["uploadUrl"]),
        content=JPEG_HEADER + b"\x00" * 128,
        headers={"Content-Type": "image/jpeg"},
    )
    media_id = intent.json()["mediaId"]
    client.post(f"/api/v1/memorials/{memorial.id}/media/{media_id}/complete", headers=headers)

    removed = client.delete(f"/api/v1/memorials/{memorial.id}/media/{media_id}", headers=headers)
    assert removed.status_code == 204

    assert client.get(f"/api/v1/memorials/{memorial.id}/media", headers=headers).json() == []


def test_empty_upload_is_rejected(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    intent = _intent(client, headers, memorial.id, filename="empty.jpg", content_type="image/jpeg")
    upload_path = _upload_url_to_path(intent.json()["uploadUrl"])

    response = client.put(upload_path, content=b"", headers={"Content-Type": "image/jpeg"})
    assert response.status_code == 422


def test_png_upload_is_accepted(client, make_user, make_memorial, auth):
    """Positive control for the sniffer: a genuine PNG passes."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)
    headers = auth(owner)

    intent = _intent(client, headers, memorial.id, filename="photo.png", content_type="image/png")
    assert intent.status_code == 201

    client.put(
        _upload_url_to_path(intent.json()["uploadUrl"]),
        content=PNG_HEADER + b"\x00" * 256,
        headers={"Content-Type": "image/png"},
    )

    complete = client.post(
        f"/api/v1/memorials/{memorial.id}/media/{intent.json()['mediaId']}/complete",
        headers=headers,
    )
    assert complete.status_code == 200
    assert complete.json()["status"] == "ready"
