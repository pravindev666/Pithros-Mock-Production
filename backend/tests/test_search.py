"""Tests for public memorial search (B5).

Covers free-text query, city filtering, year range filtering,
verification state filtering, sorting, pagination, and privacy boundaries.
"""

from __future__ import annotations

from app.core.enums import PublicationState, VerificationState


def _make_published(make_user, make_memorial, db_session, **kwargs):
    owner = make_user()
    full_name = kwargs.pop("full_name", "Test Memorial")
    slug = kwargs.pop("slug", None)
    privacy = kwargs.pop("privacy", "public")
    publication_state = kwargs.pop("publication_state", PublicationState.PUBLISHED.value)
    memorial = make_memorial(
        steward=owner,
        full_name=full_name,
        slug=slug,
        privacy=privacy,
        publication_state=publication_state,
    )
    for k, v in kwargs.items():
        setattr(memorial, k, v)
    db_session.commit()
    db_session.refresh(memorial)
    return memorial


def test_search_free_text_query(client, make_user, make_memorial, db_session):
    m1 = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Dr. Vikram Sarabhai",
        birth_place="Ahmedabad",
        short_epitaph="Visionary space scientist",
    )
    m2 = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Homi Bhabha",
        birth_place="Mumbai",
        short_epitaph="Father of nuclear program",
    )
    m3 = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="A. P. J. Abdul Kalam",
        birth_place="Rameswaram",
        short_epitaph="Missile Man of India",
    )

    # Search by full name
    res1 = client.get("/api/v1/public/search", params={"q": "Sarabhai"})
    assert res1.status_code == 200
    slugs1 = [r["slug"] for r in res1.json()["results"]]
    assert m1.slug in slugs1
    assert m2.slug not in slugs1

    # Search by epitaph
    res2 = client.get("/api/v1/public/search", params={"q": "nuclear"})
    assert res2.status_code == 200
    slugs2 = [r["slug"] for r in res2.json()["results"]]
    assert m2.slug in slugs2
    assert m1.slug not in slugs2

    # Search by birth place
    res3 = client.get("/api/v1/public/search", params={"q": "Rameswaram"})
    assert res3.status_code == 200
    slugs3 = [r["slug"] for r in res3.json()["results"]]
    assert m3.slug in slugs3


def test_search_filter_by_city(client, make_user, make_memorial, db_session):
    m_blr = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Bengaluru Resident",
        birth_place="Bengaluru, Karnataka",
    )
    m_del = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Delhi Resident",
        birth_place="New Delhi",
        resting_place="Lodhi Crematorium, Delhi",
    )
    m_chn = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Chennai Resident",
        birth_place="Chennai, Tamil Nadu",
    )

    # Filter city=Bengaluru
    res_blr = client.get("/api/v1/public/search", params={"city": "Bengaluru"})
    assert res_blr.status_code == 200
    slugs_blr = [r["slug"] for r in res_blr.json()["results"]]
    assert m_blr.slug in slugs_blr
    assert m_del.slug not in slugs_blr
    assert m_chn.slug not in slugs_blr

    # Filter by resting place city
    res_del = client.get("/api/v1/public/search", params={"city": "Delhi"})
    assert res_del.status_code == 200
    slugs_del = [r["slug"] for r in res_del.json()["results"]]
    assert m_del.slug in slugs_del
    assert m_blr.slug not in slugs_del


def test_search_filter_by_year_range(client, make_user, make_memorial, db_session):
    # m_past: 1910 - 1985
    m_past = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Early Era",
        birth_date="1910-05-15",
        death_date="1985-11-20",
    )
    # m_mid: 1950 - 2010
    m_mid = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Mid Era",
        birth_date="12 August 1950",
        death_date="03 October 2010",
    )
    # m_recent: 1990 - 2024
    m_recent = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Recent Era",
        birth_date="1990",
        death_date="2024",
    )

    # Range [1900, 1940]: matches m_past (born 1910)
    res1 = client.get("/api/v1/public/search", params={"year_from": 1900, "year_to": 1940})
    slugs1 = [r["slug"] for r in res1.json()["results"]]
    assert m_past.slug in slugs1
    assert m_mid.slug not in slugs1
    assert m_recent.slug not in slugs1

    # Range [1945, 1970]: matches m_mid (born 1950) and m_past (lived through it, 1910-1985)
    res2 = client.get("/api/v1/public/search", params={"year_from": 1945, "year_to": 1970})
    slugs2 = [r["slug"] for r in res2.json()["results"]]
    assert m_past.slug in slugs2
    assert m_mid.slug in slugs2
    assert m_recent.slug not in slugs2

    # Year from 2020: matches m_recent (died 2024)
    res3 = client.get("/api/v1/public/search", params={"year_from": 2020})
    slugs3 = [r["slug"] for r in res3.json()["results"]]
    assert m_recent.slug in slugs3
    assert m_past.slug not in slugs3
    assert m_mid.slug not in slugs3


def test_search_filter_by_verification(client, make_user, make_memorial, db_session):
    m_approved = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Verified Memorial",
        verification_state=VerificationState.APPROVED.value,
    )
    m_draft = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Unverified Memorial",
        verification_state=VerificationState.DRAFT.value,
    )

    # Filter verification_status="approved"
    res = client.get("/api/v1/public/search", params={"verification_status": "approved"})
    assert res.status_code == 200
    slugs = [r["slug"] for r in res.json()["results"]]
    assert m_approved.slug in slugs
    assert m_draft.slug not in slugs

    # Filter verification_status="reviewed" (synonym used by frontend)
    res_reviewed = client.get("/api/v1/public/search", params={"verification_status": "reviewed"})
    assert res_reviewed.status_code == 200
    slugs_rev = [r["slug"] for r in res_reviewed.json()["results"]]
    assert m_approved.slug in slugs_rev
    assert m_draft.slug not in slugs_rev


def test_search_sorting(client, make_user, make_memorial, db_session):
    _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Alice Wonder",
        birth_date="1930",
        death_date="2000",
    )
    _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Bob Builder",
        birth_date="1960",
        death_date="2010",
    )
    _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Charlie Chaplin",
        birth_date="1910",
        death_date="1970",
    )

    # Sort name_asc
    res_asc = client.get("/api/v1/public/search", params={"sort_by": "name_asc"})
    names_asc = [
        r["fullName"]
        for r in res_asc.json()["results"]
        if r["fullName"] in ["Alice Wonder", "Bob Builder", "Charlie Chaplin"]
    ]
    assert names_asc == ["Alice Wonder", "Bob Builder", "Charlie Chaplin"]

    # Sort name_desc
    res_desc = client.get("/api/v1/public/search", params={"sort_by": "name_desc"})
    names_desc = [
        r["fullName"]
        for r in res_desc.json()["results"]
        if r["fullName"] in ["Alice Wonder", "Bob Builder", "Charlie Chaplin"]
    ]
    assert names_desc == ["Charlie Chaplin", "Bob Builder", "Alice Wonder"]

    # Sort birth_date_asc
    res_birth = client.get("/api/v1/public/search", params={"sort_by": "birth_date_asc"})
    names_birth = [
        r["fullName"]
        for r in res_birth.json()["results"]
        if r["fullName"] in ["Alice Wonder", "Bob Builder", "Charlie Chaplin"]
    ]
    assert names_birth == ["Charlie Chaplin", "Alice Wonder", "Bob Builder"]


def test_search_excludes_private_family_unlisted_and_unindexed(
    client, make_user, make_memorial, db_session
):
    m_pub = _make_published(
        make_user,
        make_memorial,
        db_session,
        full_name="Public Indexable",
    )
    m_priv = _make_published(
        make_user,
        make_memorial,
        db_session,
        privacy="private",
        full_name="Private Memorial",
    )
    m_fam = _make_published(
        make_user,
        make_memorial,
        db_session,
        privacy="family",
        full_name="Family Memorial",
    )
    m_unlisted = _make_published(
        make_user,
        make_memorial,
        db_session,
        privacy="unlisted",
        full_name="Unlisted Memorial",
    )
    m_no_index = _make_published(
        make_user,
        make_memorial,
        db_session,
        search_index_enabled=False,
        full_name="No Index Memorial",
    )

    res = client.get("/api/v1/public/search")
    assert res.status_code == 200
    slugs = [r["slug"] for r in res.json()["results"]]
    assert m_pub.slug in slugs
    assert m_priv.slug not in slugs
    assert m_fam.slug not in slugs
    assert m_unlisted.slug not in slugs
    assert m_no_index.slug not in slugs


def test_search_pagination_and_total_count(client, make_user, make_memorial, db_session):
    for i in range(15):
        _make_published(
            make_user,
            make_memorial,
            db_session,
            full_name=f"Paginated Person {i:02d}",
            birth_place="Pageville",
        )

    res = client.get("/api/v1/public/search", params={"city": "Pageville", "limit": 5, "offset": 0})
    assert res.status_code == 200
    data = res.json()
    assert data["totalReturned"] == 5
    assert data["totalCount"] == 15
    assert data["limit"] == 5
    assert data["offset"] == 0
    assert len(data["results"]) == 5

    res2 = client.get(
        "/api/v1/public/search", params={"city": "Pageville", "limit": 5, "offset": 10}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["totalReturned"] == 5
    assert data2["totalCount"] == 15
    assert data2["offset"] == 10
