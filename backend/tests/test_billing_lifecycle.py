"""Paid lifecycle: purchase → expiry → Free fallback → repurchase restores premium.

Uses the real billing services and the test-only gateway simulator (the same
signed mock transport the rest of the billing suite uses). No production
authorization is weakened and no browser state is authoritative: money, the
subscription, the entitlement and the invoice all come from the backend.

The release-critical assertion is that expiry NEVER deletes a family's data.
"""

from __future__ import annotations

from sqlalchemy import select

from app.billing.catalog import FREE_TIER_LIMITS, seed_pricing_catalog
from app.billing.entitlements import resolve_memorial_entitlements
from app.billing.models import BillingAccount, Subscription
from app.billing.schemas import CreateOrderRequest, VerifyPaymentRequest
from app.billing.service import create_order, verify_and_activate_payment
from app.billing.state_machine import transition_subscription_state
from app.core.enums import SubscriptionStatus
from app.memorials.models import Memorial


def _subscription_for(db_session, user) -> Subscription:
    account = db_session.execute(
        select(BillingAccount).where(BillingAccount.owner_user_id == user.id)
    ).scalar_one()
    return (
        db_session.execute(
            select(Subscription)
            .where(Subscription.billing_account_id == account.id)
            .order_by(Subscription.created_at.desc())
        )
        .scalars()
        .first()
    )


def test_paid_lifecycle_expiry_keeps_data_and_repurchase_restores_premium(
    db_session, make_user, make_memorial
):
    user = make_user(name="Lifecycle Steward")
    # make_memorial(premium=True) buys Memorial Care through the real order +
    # verify path against the test gateway simulator.
    memorial = make_memorial(steward=user, premium=True)

    # 1. Premium is active, with the paid plan's limits.
    first = resolve_memorial_entitlements(memorial.id, db_session)
    assert first.is_premium is True
    assert first.limits.max_photos == 30

    # 2. Let the subscription lapse via the real state machine (no DB hack).
    subscription = _subscription_for(db_session, user)
    transition_subscription_state(
        subscription,
        SubscriptionStatus.EXPIRED_READ_ONLY,
        reason="Test: annual period elapsed",
        db=db_session,
    )
    db_session.flush()

    # 3. It falls back to Free, and NOTHING is deleted.
    lapsed = resolve_memorial_entitlements(memorial.id, db_session)
    assert lapsed.is_premium is False
    assert lapsed.limits.max_photos == FREE_TIER_LIMITS.max_photos
    db_session.expire_all()
    preserved = db_session.get(Memorial, memorial.id)
    assert preserved is not None and preserved.deleted_at is None
    assert db_session.get(Memorial, memorial.id).slug == memorial.slug

    # 4. Repurchase the same plan through the simulator.
    order = create_order(
        user,
        CreateOrderRequest(planPriceId="memorial_care_annual_v1", memorialId=memorial.id),
        db_session,
    )
    verify_and_activate_payment(
        user,
        VerifyPaymentRequest(internalOrderId=order.internal_order_id),
        db_session,
    )

    # 5. Premium is restored on the SAME memorial — no re-upload required.
    restored = resolve_memorial_entitlements(memorial.id, db_session)
    assert restored.is_premium is True
    assert restored.limits.max_photos == 30


def test_family_archive_plan_grants_multi_memorial_entitlements(
    db_session, make_user, make_memorial
):
    """The second paid tier (Family Archive, ₹2,999) grants its own limits."""
    user = make_user(name="Archive Steward")
    memorial = make_memorial(steward=user, premium=False)
    seed_pricing_catalog(db_session)

    order = create_order(
        user,
        CreateOrderRequest(planPriceId="family_archive_annual_v1", memorialId=memorial.id),
        db_session,
    )
    verify_and_activate_payment(
        user,
        VerifyPaymentRequest(internalOrderId=order.internal_order_id),
        db_session,
    )

    report = resolve_memorial_entitlements(memorial.id, db_session)
    assert report.is_premium is True
    assert report.plan_name is not None
    assert report.limits.max_photos == 150
    assert report.limits.max_contributors == 50
