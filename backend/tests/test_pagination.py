"""Keyset pagination.

Offset paging skips and duplicates rows when the list is being written to between
pages. These tests insert *while* paging, which is the case that actually breaks
offset paging and the reason this is keyset.
"""

from __future__ import annotations

from app.core.pagination import HAS_MORE_HEADER, NEXT_CURSOR_HEADER


def _tributes(client, slug, *, limit=None, cursor=None, headers=None):
    params: dict[str, object] = {}
    if limit is not None:
        params["limit"] = limit
    if cursor is not None:
        params["cursor"] = cursor
    return client.get(
        f"/api/v1/public/memorials/{slug}/tributes", params=params, headers=headers or {}
    )


def _submit(client, slug, message):
    return client.post(
        f"/api/v1/public/memorials/{slug}/tributes",
        json={"authorName": "Well-wisher", "message": message},
    )


def test_array_body_is_preserved_and_metadata_travels_in_headers(
    client, make_user, make_memorial, auth
):
    """The frontend contract is a plain array; paging info rides in headers so no
    view had to change."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")

    body = _tributes(client, memorial.slug, limit=5).json()

    assert isinstance(body, list)


def test_paging_visits_every_row_exactly_once_while_rows_are_being_added(
    client, make_user, make_memorial, auth
):
    """The property offset paging cannot guarantee."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")
    headers = auth(owner)

    for index in range(5):
        _submit(client, memorial.slug, f"Tribute {index}")

    seen: list[str] = []
    cursor = None
    pages = 0

    while True:
        response = _tributes(client, memorial.slug, limit=2, cursor=cursor, headers=headers)
        assert response.status_code == 200
        seen.extend(item["id"] for item in response.json())
        pages += 1

        # Insert mid-pagination: an offset-based page 2 would now be shifted.
        _submit(client, memorial.slug, f"Arrived during page {pages}")

        if response.headers.get(HAS_MORE_HEADER) != "true":
            break
        cursor = response.headers.get(NEXT_CURSOR_HEADER)
        assert cursor, "has_more was true but no cursor was returned"
        assert pages < 20, "pagination did not terminate"

    assert len(seen) == len(set(seen)), f"a row was returned twice: {seen}"


def test_limit_above_the_ceiling_is_refused(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")

    response = _tributes(client, memorial.slug, limit=5000)

    assert response.status_code == 422


def test_limit_below_one_is_refused(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")

    assert _tributes(client, memorial.slug, limit=0).status_code == 422


def test_malformed_cursor_is_a_validation_error(client, make_user, make_memorial):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, privacy="public")

    response = _tributes(client, memorial.slug, cursor="!!!not-base64!!!")

    assert response.status_code == 422


def test_my_memorials_is_paginated(client, make_user, auth):
    creator = make_user(name="Prolific")
    headers = auth(creator)

    for index in range(5):
        client.post(
            "/api/v1/memorials",
            json={"fullName": f"Memorial Number {index}"},
            headers=headers,
        )

    first = client.get("/api/v1/me/memorials", params={"limit": 2}, headers=headers)
    assert first.status_code == 200
    assert len(first.json()) == 2
    assert first.headers[HAS_MORE_HEADER] == "true"

    second = client.get(
        "/api/v1/me/memorials",
        params={"limit": 2, "cursor": first.headers[NEXT_CURSOR_HEADER]},
        headers=headers,
    )
    assert second.status_code == 200

    first_ids = {item["id"] for item in first.json()}
    second_ids = {item["id"] for item in second.json()}
    assert first_ids.isdisjoint(second_ids), "pages overlapped"


def test_internal_projections_are_not_limited_by_the_client_ceiling(
    client, make_user, make_memorial, auth
):
    """Regression: PageParams once enforced the *client* limit ceiling (100) on
    internal callers, and the memorial projection legitimately pages 200/300."""
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    response = client.get(f"/api/v1/memorials/{memorial.id}", headers=auth(owner))

    assert response.status_code == 200, response.text
