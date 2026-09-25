"""Object-level authorization.

Every case here is a request a malicious or merely curious user could actually
send. The expectation is always a server-side refusal — the UI hiding a button is
not a control, and none of these tests touch the frontend.
"""

from __future__ import annotations

import pytest

from app.core.enums import (
    AdminSubRole,
    ContributorRole,
    ContributorStatus,
    PrivacyLevel,
    PublicationState,
)
from app.core.errors import ForbiddenError
from app.memorials.schemas import MemorialPublicOut


def _patch_payload(**overrides) -> dict:
    payload = {"shortEpitaph": "Changed by someone who should not be able to."}
    payload.update(overrides)
    return payload


# ─── Editing ────────────────────────────────────────────────────────────────


def test_non_member_cannot_patch_a_public_memorial(client, make_user, make_memorial, auth):
    """The headline case: another signed-in user must not edit someone's memorial."""
    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json=_patch_payload(),
        headers=auth(intruder),
    )

    assert response.status_code == 403


def test_non_member_cannot_patch_a_private_memorial(client, make_user, make_memorial, auth):
    """A private memorial must not even confirm it exists — 404, not 403."""
    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PRIVATE.value)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json=_patch_payload(),
        headers=auth(intruder),
    )

    assert response.status_code == 404


def test_anonymous_cannot_patch_any_memorial(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value)

    response = client.patch(f"/api/v1/memorials/{memorial.id}", json=_patch_payload())

    assert response.status_code == 401


def test_steward_can_patch_their_own_memorial(client, make_user, make_memorial, auth):
    """The positive control — the guard must not block the legitimate owner."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json=_patch_payload(),
        headers=auth(owner),
    )

    assert response.status_code == 200
    assert response.json()["shortEpitaph"].startswith("Changed by someone")


# ─── Theme and privacy ──────────────────────────────────────────────────────


def test_viewer_contributor_cannot_change_theme(
    client, make_user, make_memorial, add_contributor, auth
):
    owner = make_user(name="Owner")
    viewer = make_user(name="Viewer")
    memorial = make_memorial(steward=owner)
    add_contributor(memorial=memorial, user=viewer, role=ContributorRole.VIEWER.value)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json=_patch_payload(theme="garden"),
        headers=auth(viewer),
    )

    assert response.status_code == 403


def test_biographer_cannot_change_theme(client, make_user, make_memorial, add_contributor, auth):
    """A biographer may edit the story but changing the theme is a management act."""
    owner = make_user(name="Owner")
    biographer = make_user(name="Biographer")
    memorial = make_memorial(steward=owner)
    add_contributor(memorial=memorial, user=biographer, role=ContributorRole.BIOGRAPHER.value)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json=_patch_payload(theme="garden"),
        headers=auth(biographer),
    )

    assert response.status_code == 403


def test_biographer_can_edit_story(client, make_user, make_memorial, add_contributor, auth):
    owner = make_user(name="Owner")
    biographer = make_user(name="Biographer")
    memorial = make_memorial(steward=owner)
    add_contributor(memorial=memorial, user=biographer, role=ContributorRole.BIOGRAPHER.value)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json={"story": {"overview": "A life well lived."}},
        headers=auth(biographer),
    )

    assert response.status_code == 200


def test_contributor_cannot_change_privacy(client, make_user, make_memorial, add_contributor, auth):
    owner = make_user(name="Owner")
    archivist = make_user(name="Archivist")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PRIVATE.value)
    add_contributor(memorial=memorial, user=archivist, role=ContributorRole.PHOTO_ARCHIVIST.value)

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json=_patch_payload(privacy="public"),
        headers=auth(archivist),
    )

    assert response.status_code == 403


def test_revoked_contributor_loses_access(client, make_user, make_memorial, add_contributor, auth):
    """Revocation must be immediate — a stale membership row is not enough."""
    owner = make_user(name="Owner")
    former = make_user(name="Former member")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value)
    add_contributor(
        memorial=memorial,
        user=former,
        role=ContributorRole.BIOGRAPHER.value,
        status=ContributorStatus.REVOKED.value,
    )

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json=_patch_payload(),
        headers=auth(former),
    )

    assert response.status_code == 403


def test_revoked_contributor_gets_404_on_a_private_memorial(
    client, make_user, make_memorial, add_contributor, auth
):
    """On a private memorial even the fact of its existence is withheld."""
    owner = make_user(name="Owner")
    former = make_user(name="Former member")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PRIVATE.value)
    add_contributor(
        memorial=memorial,
        user=former,
        role=ContributorRole.BIOGRAPHER.value,
        status=ContributorStatus.REVOKED.value,
    )

    response = client.patch(
        f"/api/v1/memorials/{memorial.id}",
        json=_patch_payload(),
        headers=auth(former),
    )

    assert response.status_code == 404


# ─── Private / family / unlisted visibility ─────────────────────────────────


@pytest.mark.parametrize("privacy", [PrivacyLevel.PRIVATE.value, PrivacyLevel.FAMILY.value])
def test_anonymous_cannot_read_restricted_memorials(client, make_user, make_memorial, privacy):
    """Idle probing must not reveal that a restricted memorial exists."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy=privacy)

    response = client.get(f"/api/v1/public/memorials/{memorial.slug}")

    assert response.status_code == 404


@pytest.mark.parametrize("privacy", [PrivacyLevel.PRIVATE.value, PrivacyLevel.FAMILY.value])
def test_signed_in_non_member_cannot_read_restricted_memorials(
    client, make_user, make_memorial, auth, privacy
):
    owner = make_user(name="Owner")
    stranger = make_user(name="Stranger")
    memorial = make_memorial(steward=owner, privacy=privacy)

    response = client.get(f"/api/v1/public/memorials/{memorial.slug}", headers=auth(stranger))

    assert response.status_code == 404


def test_unlisted_memorial_reachable_but_not_indexable(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.UNLISTED.value)

    response = client.get(f"/api/v1/public/memorials/{memorial.slug}")

    assert response.status_code == 200
    assert "noindex" in response.headers.get("x-robots-tag", "")


def test_draft_memorial_is_not_publicly_readable(client, make_user, make_memorial):
    """Publication state and privacy are separate: public + draft is still hidden."""
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        privacy=PrivacyLevel.PUBLIC.value,
        publication_state=PublicationState.DRAFT.value,
    )

    response = client.get(f"/api/v1/public/memorials/{memorial.slug}")

    assert response.status_code == 404


# ─── Public projection is an allowlist ──────────────────────────────────────


def test_public_payload_contains_no_private_fields(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner", email="owner-visible@example.com")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value)

    response = client.get(f"/api/v1/public/memorials/{memorial.slug}")
    assert response.status_code == 200
    body = response.json()

    forbidden = {
        "stewardEmail",
        "stewardId",
        "steward_email",
        "steward_id",
        "publicationState",
        "completenessPercent",
        "searchIndexEnabled",
        "isDemo",
        "deletedAt",
    }
    assert forbidden.isdisjoint(body.keys()), f"leaked: {forbidden & set(body)}"
    assert "owner-visible@example.com" not in response.text


def test_public_projection_key_set_is_frozen():
    """Adding a field to the public projection must be a deliberate act.

    If this test fails, a new key reached anonymous callers. Confirm it is safe to
    expose, then update the expected set.
    """
    expected = {
        "id",
        "slug",
        "fullName",
        "preferredName",
        "birthDate",
        "deathDate",
        "birthPlace",
        "restingPlace",
        "shortEpitaph",
        "portraitUrl",
        "coverUrl",
        "story",
        "privacy",
        "verificationStatus",
        "verificationBadgeType",
        "theme",
        "timeline",
        "media",
        "tributes",
        "offerings",
        "legacyLinks",
        "stewardName",
        "stewardRelationship",
        "createdAt",
        "updatedAt",
    }

    actual = {field.alias or name for name, field in MemorialPublicOut.model_fields.items()}

    assert actual == expected


def test_public_id_is_the_slug_not_the_internal_uuid(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value)

    body = client.get(f"/api/v1/public/memorials/{memorial.slug}").json()

    assert body["id"] == memorial.slug
    assert str(memorial.id) not in str(body)


# ─── Search ─────────────────────────────────────────────────────────────────


def test_search_excludes_private_family_and_unlisted(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    make_memorial(steward=owner, privacy=PrivacyLevel.PRIVATE.value, full_name="Alpha Private")
    make_memorial(steward=owner, privacy=PrivacyLevel.FAMILY.value, full_name="Beta Family")
    make_memorial(steward=owner, privacy=PrivacyLevel.UNLISTED.value, full_name="Gamma Unlisted")
    make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value, full_name="Delta Public")

    results = client.get("/api/v1/public/search").json()["results"]
    names = {item["fullName"] for item in results}

    assert "Delta Public" in names
    assert "Alpha Private" not in names
    assert "Beta Family" not in names
    assert "Gamma Unlisted" not in names


def test_memorial_list_returns_only_my_memberships(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    other = make_user(name="Other")
    mine = make_memorial(steward=owner, full_name="Mine")
    make_memorial(steward=other, full_name="Not mine")

    response = client.get("/api/v1/me/memorials", headers=auth(owner))
    assert response.status_code == 200

    ids = {item["id"] for item in response.json()}
    assert str(mine.id) in ids
    assert len(ids) == 1


# ─── Tributes ───────────────────────────────────────────────────────────────


def test_anonymous_tribute_is_not_auto_approved(client, make_user, make_memorial):
    """Replaces the prototype's `isApproved: true` on every submission."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value)

    response = client.post(
        f"/api/v1/public/memorials/{memorial.slug}/tributes",
        json={
            "authorName": "Well-wisher",
            "relationship": "Friend",
            "message": "With deepest sympathy.",
        },
    )

    assert response.status_code == 201
    assert response.json()["isApproved"] is False


def test_pending_tribute_is_hidden_from_the_public_but_visible_to_the_steward(
    client, make_user, make_memorial, auth
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value)

    client.post(
        f"/api/v1/public/memorials/{memorial.slug}/tributes",
        json={"authorName": "Well-wisher", "message": "Thinking of you all."},
    )

    public_list = client.get(f"/api/v1/public/memorials/{memorial.slug}/tributes").json()
    assert public_list == []

    steward_list = client.get(
        f"/api/v1/public/memorials/{memorial.slug}/tributes", headers=auth(owner)
    ).json()
    assert len(steward_list) == 1
    assert steward_list[0]["isApproved"] is False


def test_offerings_are_persisted_with_an_anonymous_sender(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value)

    response = client.post(
        f"/api/v1/public/memorials/{memorial.slug}/offerings",
        json={"type": "flower", "senderName": "Anonymous"},
    )

    assert response.status_code == 201
    assert response.json()["type"] == "flower"

    offerings = client.get(f"/api/v1/public/memorials/{memorial.slug}/offerings").json()
    assert len(offerings) == 1


# ─── Media ──────────────────────────────────────────────────────────────────


def test_non_member_cannot_request_an_upload_url(client, make_user, make_memorial, auth):
    """The most dangerous endpoint to leave open: it mints a storage write URL."""
    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    memorial = make_memorial(steward=owner, privacy=PrivacyLevel.PUBLIC.value)

    response = client.post(
        f"/api/v1/memorials/{memorial.id}/media/upload-intent",
        json={"filename": "photo.jpg", "contentType": "image/jpeg", "kind": "photo"},
        headers=auth(intruder),
    )

    assert response.status_code == 403


def test_viewer_contributor_cannot_request_an_upload_url(
    client, make_user, make_memorial, add_contributor, auth
):
    """VIEW does not imply MANAGE_MEDIA."""
    owner = make_user(name="Owner")
    viewer = make_user(name="Viewer")
    memorial = make_memorial(steward=owner)
    add_contributor(memorial=memorial, user=viewer, role=ContributorRole.VIEWER.value)

    response = client.post(
        f"/api/v1/memorials/{memorial.id}/media/upload-intent",
        json={"filename": "photo.jpg", "contentType": "image/jpeg", "kind": "photo"},
        headers=auth(viewer),
    )

    assert response.status_code == 403


def test_steward_gets_an_upload_url_that_hides_the_storage_key(
    client, make_user, make_memorial, auth
):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.post(
        f"/api/v1/memorials/{memorial.id}/media/upload-intent",
        json={"filename": "portrait.jpg", "contentType": "image/jpeg", "kind": "photo"},
        headers=auth(owner),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["uploadUrl"]
    assert "storageKey" not in body
    assert "storageBucket" not in body


def test_executable_upload_is_rejected(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.post(
        f"/api/v1/memorials/{memorial.id}/media/upload-intent",
        json={"filename": "payload.exe", "kind": "document"},
        headers=auth(owner),
    )

    assert response.status_code == 422


def test_extension_and_content_type_must_agree(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.post(
        f"/api/v1/memorials/{memorial.id}/media/upload-intent",
        json={"filename": "photo.jpg", "contentType": "application/pdf", "kind": "photo"},
        headers=auth(owner),
    )

    assert response.status_code == 422


# ─── Admin guard ────────────────────────────────────────────────────────────


def test_family_steward_is_refused_admin_endpoints(make_user):
    """Admin access needs the admin role *and* an accepted subrole.

    Phase 1 exercises the guard directly; the admin routers themselves arrive with
    the admin console.
    """
    steward = make_user(name="Family Steward", role="family_steward")

    guard = __import__("app.auth.dependencies", fromlist=["require_admin_role"]).require_admin_role(
        AdminSubRole.FINANCE
    )

    with pytest.raises(ForbiddenError):
        guard(user=steward)


def test_admin_without_the_matching_subrole_is_refused(make_user):
    from app.auth.dependencies import require_admin_role

    moderator = make_user(name="Moderator", role="admin")
    moderator.admin_subrole = AdminSubRole.MODERATOR.value

    guard = require_admin_role(AdminSubRole.FINANCE)

    with pytest.raises(ForbiddenError):
        guard(user=moderator)


def test_super_admin_satisfies_any_subrole_requirement(make_user):
    from app.auth.dependencies import require_admin_role

    super_admin = make_user(name="Super Admin", role="admin")
    super_admin.admin_subrole = AdminSubRole.SUPER_ADMIN.value

    guard = require_admin_role(AdminSubRole.FINANCE)

    assert guard(user=super_admin) is super_admin


# ─── Roles must not be inferred from the email ──────────────────────────────


@pytest.mark.parametrize(
    "email",
    ["admin@pithros.org", "someone-admin@example.com", "partner@example.com"],
)
def test_signup_never_grants_a_role_from_the_email_address(client, email, db_session):
    """The prototype promoted anyone whose address contained `admin@`.

    A new account is a visitor until an explicit domain action or an
    administrator changes that.
    """
    token = "token-for-provisioning-test"
    from app.auth.dependencies import get_token_verifier
    from app.auth.firebase import FirebaseIdentity
    from app.main import app as fastapi_app

    class _Verifier:
        def verify(self, _token: str) -> FirebaseIdentity:
            return FirebaseIdentity(
                uid=f"uid_{email}",
                email=email,
                email_verified=True,
                name="New Person",
                sign_in_provider="password",
            )

    fastapi_app.dependency_overrides[get_token_verifier] = lambda: _Verifier()
    try:
        response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    finally:
        fastapi_app.dependency_overrides.pop(get_token_verifier, None)

    assert response.status_code == 200
    assert response.json()["role"] == "visitor"
    assert response.json()["admin_subrole"] is None
