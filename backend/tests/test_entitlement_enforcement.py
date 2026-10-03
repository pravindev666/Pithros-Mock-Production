"""Paid limits are enforced server-side, not merely advertised.

The wiring itself is proven by the flow tests that used to pass and now return 422
(export, legacy links, extra contributors) — these pin the boundary behaviour of
the gates those flows now consult.
"""

from __future__ import annotations

from app.billing.entitlements import (
    assert_can_add_contributor,
    assert_can_add_timeline_event,
    assert_can_export_archive,
    assert_can_manage_legacy_links,
)


def test_paid_features_are_refused_on_a_free_memorial(db_session, make_user, make_memorial):
    owner = make_user(name="Free Owner")
    memorial = make_memorial(steward=owner, premium=False)

    can_export, export_reason = assert_can_export_archive(memorial.id, db_session)
    assert can_export is False
    assert export_reason

    can_legacy, legacy_reason = assert_can_manage_legacy_links(memorial.id, db_session)
    assert can_legacy is False
    assert legacy_reason


def test_paid_features_are_available_on_a_paid_memorial(db_session, make_user, make_memorial):
    owner = make_user(name="Paying Owner")
    memorial = make_memorial(steward=owner, premium=True)

    assert assert_can_export_archive(memorial.id, db_session)[0] is True
    assert assert_can_manage_legacy_links(memorial.id, db_session)[0] is True
    assert assert_can_add_contributor(memorial.id, db_session)[0] is True
    assert assert_can_add_timeline_event(memorial.id, db_session)[0] is True


def test_premium_themes_are_gated_on_a_free_memorial(db_session, make_user, make_memorial):
    from app.billing.entitlements import assert_can_use_premium_theme

    owner = make_user(name="Free Owner")
    memorial = make_memorial(steward=owner, premium=False)

    # The free themes always work.
    assert assert_can_use_premium_theme(memorial.id, "classic", db_session)[0] is True
    assert assert_can_use_premium_theme(memorial.id, "ivory", db_session)[0] is True

    allowed, reason = assert_can_use_premium_theme(memorial.id, "midnight", db_session)
    assert allowed is False
    assert reason


def test_premium_themes_are_available_on_a_paid_memorial(db_session, make_user, make_memorial):
    from app.billing.entitlements import assert_can_use_premium_theme

    owner = make_user(name="Paying Owner")
    memorial = make_memorial(steward=owner, premium=True)

    assert assert_can_use_premium_theme(memorial.id, "candlelight", db_session)[0] is True


def test_a_free_steward_cannot_start_with_a_premium_theme(db_session, make_user, make_memorial):
    """Creation-time path: the family's own plan decides, not the new memorial's."""
    from app.billing.entitlements import assert_steward_can_use_premium_theme

    free_owner = make_user(name="Free Owner")
    assert assert_steward_can_use_premium_theme(free_owner.id, "classic", db_session)[0] is True
    allowed, reason = assert_steward_can_use_premium_theme(free_owner.id, "midnight", db_session)
    assert allowed is False
    assert reason

    # A family with a paid plan may start a new memorial on a premium theme.
    paying_owner = make_user(name="Paying Owner")
    make_memorial(steward=paying_owner, premium=True)
    assert assert_steward_can_use_premium_theme(paying_owner.id, "midnight", db_session)[0] is True
