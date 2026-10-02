"""Unit and integration tests for the PITHROS billing, subscriptions,
entitlements, and state machine."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.billing.catalog import seed_pricing_catalog
from app.billing.entitlements import (
    assert_can_add_contributor,
    assert_can_add_timeline_event,
    assert_can_export_archive,
    assert_can_manage_legacy_links,
    assert_can_upload_media,
)
from app.billing.models import (
    Invoice,
    MemorialEntitlement,
    Payment,
    Subscription,
)
from app.billing.schemas import (
    AdminExtendSubscriptionRequest,
    AdminGrantEntitlementRequest,
    AdminRevokeSubscriptionRequest,
    CreateOrderRequest,
    VerifyPaymentRequest,
)
from app.billing.service import (
    admin_extend_subscription,
    admin_get_billing_overview,
    admin_grant_entitlement,
    admin_revoke_subscription,
    assign_memorial_slot,
    create_family_sponsorship_link,
    create_order,
    get_pricing_catalog,
    get_sponsorship_info,
    release_memorial_slot,
    verify_and_activate_payment,
)
from app.billing.state_machine import (
    SubscriptionStateError,
    transition_subscription_state,
)
from app.core.enums import (
    MediaKind,
    MemorialEntitlementStatus,
    PaymentStatus,
    PlanCode,
    SubscriptionStatus,
)
from app.core.errors import ConflictError
from app.memorials.models import Memorial


@pytest.fixture(autouse=True)
def ensure_catalog(db_session):
    seed_pricing_catalog(db_session)


def test_pricing_catalog_spec(db_session):
    """Verify that catalog pricing strictly complies with the PRD specification."""
    catalog = get_pricing_catalog(db_session)
    plans = {p.code: p for p in catalog.plans}

    assert PlanCode.MEMORIAL_CARE in plans
    assert PlanCode.FAMILY_ARCHIVE in plans
    assert PlanCode.ADDITIONAL_MEMORIAL in plans

    # Memorial Care pricing
    care_prices = {pr.id: pr for pr in plans[PlanCode.MEMORIAL_CARE].prices}
    assert care_prices["memorial_care_monthly_v1"].amount_minor == 24900  # ₹249
    assert care_prices["memorial_care_half_yearly_v1"].amount_minor == 64900  # ₹649
    assert care_prices["memorial_care_half_yearly_v1"].savings_copy == "Save ₹845 vs monthly"
    assert care_prices["memorial_care_annual_v1"].amount_minor == 99900  # ₹999
    assert care_prices["memorial_care_annual_v1"].savings_copy == "Save ₹1,989 vs monthly"
    assert care_prices["memorial_care_annual_v1"].is_primary is True

    # Family Archive pricing
    family_prices = {pr.id: pr for pr in plans[PlanCode.FAMILY_ARCHIVE].prices}
    assert family_prices["family_archive_annual_v1"].amount_minor == 299900  # ₹2,999
    assert (
        family_prices["family_archive_annual_v1"].savings_copy
        == "Save ₹1,996 vs 5 individual memorials"
    )

    # Free Tier Limits
    assert catalog.free_tier.max_photos == 3
    assert catalog.free_tier.max_media_bytes == 15 * 1024 * 1024  # 15 MB
    assert catalog.free_tier.max_file_bytes == 5 * 1024 * 1024  # 5 MB
    assert catalog.free_tier.max_timeline_events == 5
    assert catalog.free_tier.max_contributors == 1
    assert catalog.free_tier.max_video_bytes == 0
    assert catalog.free_tier.max_audio_bytes == 0
    assert catalog.free_tier.max_audio_file_bytes == 0
    assert catalog.free_tier.max_daily_upload_attempts == 10
    assert catalog.free_tier.archive_export_enabled is False


def test_order_creation_and_tamper_defense(db_session, make_user):
    """Verify orders compute amounts server-side and create pending payment records."""
    user = make_user(name="Praveen Kumar", email="praveen@example.com")
    req = CreateOrderRequest(planPriceId="memorial_care_annual_v1")

    order = create_order(user, req, db_session)

    assert order.internal_order_id.startswith("PITH-ORD-")
    assert order.amount_minor == 99900  # Server-enforced ₹999
    assert order.currency == "INR"
    assert order.plan_code == PlanCode.MEMORIAL_CARE

    # Verify payment record in DB
    payment = db_session.execute(
        select(Payment).where(Payment.internal_order_id == order.internal_order_id)
    ).scalar_one()
    assert payment.status == PaymentStatus.PENDING
    assert payment.amount_minor == 99900


def test_payment_verification_and_subscription_activation(db_session, make_user, make_memorial):
    """Verify that successful payment activates subscription, assigns slot, and
    generates invoice."""
    user = make_user(name="Aarti Sharma", email="aarti@example.com")
    memorial = make_memorial(steward=user, full_name="Grandfather Sharma", premium=False)

    # 1. Create order
    order = create_order(
        user,
        CreateOrderRequest(planPriceId="memorial_care_annual_v1", memorialId=memorial.id),
        db_session,
    )

    # 2. Verify payment
    verify_res = verify_and_activate_payment(
        user,
        VerifyPaymentRequest(
            internalOrderId=order.internal_order_id,
            gatewayPaymentId="cf_pay_998877",
            paymentMethodType="UPI",
        ),
        db_session,
    )

    assert verify_res.success is True
    assert verify_res.status == SubscriptionStatus.ACTIVE
    assert verify_res.assigned_memorial_id == memorial.id
    assert verify_res.invoice_number.startswith("PITH-INV-")

    # 3. Check Subscription in DB
    sub = db_session.execute(
        select(Subscription).where(Subscription.id == verify_res.subscription_id)
    ).scalar_one()
    assert sub.status == SubscriptionStatus.ACTIVE
    assert sub.entitlements.max_photos == 30
    assert sub.entitlements.max_media_bytes == 300 * 1024 * 1024
    assert sub.entitlements.max_audio_bytes == 100 * 1024 * 1024
    assert sub.entitlements.max_audio_file_bytes == 50 * 1024 * 1024
    assert sub.entitlements.max_daily_upload_attempts == 50

    # 4. Check Memorial Slot Allocation
    slot = db_session.execute(
        select(MemorialEntitlement).where(
            MemorialEntitlement.subscription_id == sub.id,
            MemorialEntitlement.memorial_id == memorial.id,
        )
    ).scalar_one()
    assert slot.slot_number == 1
    assert slot.status == MemorialEntitlementStatus.ASSIGNED

    # 5. Check Immutable Invoice
    inv = db_session.execute(select(Invoice).where(Invoice.subscription_id == sub.id)).scalar_one()
    assert inv.amount_minor == 99900
    assert inv.status == "paid"


def test_subscription_state_machine_and_zero_deletion(db_session, make_user, make_memorial):
    """CRITICAL RULE: Expired or failed subscription NEVER deletes the memorial or user data."""
    user = make_user(name="Suresh Rao")
    memorial = make_memorial(steward=user, full_name="Mother Rao")

    order = create_order(
        user,
        CreateOrderRequest(planPriceId="memorial_care_annual_v1", memorialId=memorial.id),
        db_session,
    )
    verify_res = verify_and_activate_payment(
        user,
        VerifyPaymentRequest(internalOrderId=order.internal_order_id),
        db_session,
    )
    sub = db_session.execute(
        select(Subscription).where(Subscription.id == verify_res.subscription_id)
    ).scalar_one()

    # Transition: ACTIVE -> PAST_DUE (T0 renewal failed)
    sub = transition_subscription_state(
        sub, SubscriptionStatus.PAST_DUE, reason="Renewal failed", db=db_session
    )
    assert sub.status == SubscriptionStatus.PAST_DUE

    # Transition: PAST_DUE -> GRACE (T+7 automated retries completed)
    sub = transition_subscription_state(
        sub, SubscriptionStatus.GRACE, reason="Entering grace period", db=db_session
    )
    assert sub.status == SubscriptionStatus.GRACE
    assert sub.grace_period_end is not None

    # Transition: GRACE -> EXPIRED_READ_ONLY (T+30 grace window ended)
    sub = transition_subscription_state(
        sub, SubscriptionStatus.EXPIRED_READ_ONLY, reason="Grace period ended", db=db_session
    )
    assert sub.status == SubscriptionStatus.EXPIRED_READ_ONLY

    # ZERO-DELETION INVARIANT: Memorial and user must remain completely intact!
    refreshed_memorial = db_session.execute(
        select(Memorial).where(Memorial.id == memorial.id)
    ).scalar_one()
    assert refreshed_memorial.deleted_at is None
    assert refreshed_memorial.full_name == "Mother Rao"

    # Recovery Transition: EXPIRED_READ_ONLY -> ACTIVE (User renews)
    sub = transition_subscription_state(
        sub, SubscriptionStatus.ACTIVE, reason="Payment recovery successful", db=db_session
    )
    assert sub.status == SubscriptionStatus.ACTIVE
    assert sub.grace_period_start is None
    assert sub.grace_period_end is None


def test_illegal_state_transition_rejected(db_session, make_user):
    """Verify state machine prohibits illegal jumps (e.g. PENDING straight to PAST_DUE)."""
    user = make_user()
    order = create_order(
        user, CreateOrderRequest(planPriceId="memorial_care_monthly_v1"), db_session
    )
    payment = db_session.execute(
        select(Payment).where(Payment.internal_order_id == order.internal_order_id)
    ).scalar_one()

    account = payment.billing_account
    sub = Subscription(
        billing_account_id=account.id,
        plan_id=payment.price.plan_id,
        price_id=payment.plan_price_id,
        status=SubscriptionStatus.PENDING,
        current_period_start=datetime.now(UTC),
        current_period_end=datetime.now(UTC),
    )
    db_session.add(sub)
    db_session.flush()

    with pytest.raises(SubscriptionStateError):
        transition_subscription_state(
            sub, SubscriptionStatus.PAST_DUE, reason="Illegal jump", db=db_session
        )


def test_memorial_slot_capacity_limits(db_session, make_user, make_memorial):
    """Verify single plan allows 1 slot while family archive allows up to 5 slots."""
    user = make_user()
    m1 = make_memorial(steward=user, full_name="Memorial A")
    m2 = make_memorial(steward=user, full_name="Memorial B")

    # 1. Single Memorial Care subscription
    order = create_order(
        user,
        CreateOrderRequest(planPriceId="memorial_care_annual_v1", memorialId=m1.id),
        db_session,
    )
    res = verify_and_activate_payment(
        user, VerifyPaymentRequest(internalOrderId=order.internal_order_id), db_session
    )

    # Attempting to assign m2 to the same single-memorial subscription must fail
    with pytest.raises(ConflictError):
        assign_memorial_slot(user, res.subscription_id, m2.id, db_session)

    # 2. Release slot
    release_memorial_slot(user, res.subscription_id, m1.id, db_session)

    # Memorial remains safe
    db_session.refresh(m1)
    assert m1.deleted_at is None

    # Now m2 can take the vacant slot 1
    new_slot = assign_memorial_slot(user, res.subscription_id, m2.id, db_session)
    assert new_slot.slot_number == 1
    assert new_slot.memorial_id == m2.id


def test_entitlement_checks_free_vs_premium(db_session, make_user, make_memorial):
    """Verify media uploads and features are properly gated between Free and Premium."""
    from app.core.enums import MediaStatus
    from app.media.models import MediaItem

    user = make_user()
    memorial = make_memorial(steward=user, full_name="Test Memorial", premium=False)

    # 1. FREE MEMORIAL: Per-file size ceiling (>5 MB rejected)
    can_oversize, oversize_msg = assert_can_upload_media(
        memorial.id, MediaKind.PHOTO, 6 * 1024 * 1024, db_session
    )
    assert can_oversize is False
    assert "File size exceeds the 5 MB limit for Free Memorials" in oversize_msg

    # Normal photo (under 5 MB) permitted
    can_photo, _ = assert_can_upload_media(
        memorial.id, MediaKind.PHOTO, 2 * 1024 * 1024, db_session
    )
    assert can_photo is True

    # Voice, Video, Export, Legacy links gated on Free
    can_voice, voice_msg = assert_can_upload_media(
        memorial.id, MediaKind.VOICE, 1024 * 1024, db_session
    )
    assert can_voice is False
    assert "Voice memories are preserved with PITHROS Memorial Care" in voice_msg

    can_video, video_msg = assert_can_upload_media(
        memorial.id, MediaKind.VIDEO, 2 * 1024 * 1024, db_session
    )
    assert can_video is False
    assert "Video preservation is on the product roadmap" in video_msg

    can_export, export_msg = assert_can_export_archive(memorial.id, db_session)
    assert can_export is False
    assert "Digital archive export" in export_msg

    can_legacy, legacy_msg = assert_can_manage_legacy_links(memorial.id, db_session)
    assert can_legacy is False
    assert "Digital legacy links" in legacy_msg

    # Free memorial allows up to 5 timeline events and 1 additional contributor
    can_timeline, _ = assert_can_add_timeline_event(memorial.id, db_session)
    assert can_timeline is True
    can_contrib, _ = assert_can_add_contributor(memorial.id, db_session)
    assert can_contrib is True

    # Fill free photo capacity (3 photos: portrait, family, milestone)
    for i in range(3):
        item = MediaItem(
            memorial_id=memorial.id,
            kind=MediaKind.PHOTO.value,
            status=MediaStatus.READY.value,
            privacy="public",
            storage_tier="private",
            storage_bucket="pithros-private",
            storage_key=f"memorials/{memorial.id}/photo_{i}.jpg",
            original_filename=f"photo_{i}.jpg",
            mime_type="image/jpeg",
            size_bytes=2 * 1024 * 1024,  # 2 MB each
            uploaded_by_id=user.id,
        )
        db_session.add(item)
    db_session.flush()

    # 4th photo must trigger the conversion paywall!
    can_fourth, fourth_msg = assert_can_upload_media(
        memorial.id, MediaKind.PHOTO, 1 * 1024 * 1024, db_session
    )
    assert can_fourth is False
    assert "Free Memorial includes 3 photographs" in fourth_msg
    assert "Upgrade to Memorial Care to preserve up to 30 photographs" in fourth_msg

    # 2. UPGRADE TO MEMORIAL CARE
    order = create_order(
        user,
        CreateOrderRequest(planPriceId="memorial_care_annual_v1", memorialId=memorial.id),
        db_session,
    )
    verify_and_activate_payment(
        user, VerifyPaymentRequest(internalOrderId=order.internal_order_id), db_session
    )

    # 3. PREMIUM MEMORIAL: 30 photos, 300 MB media, Voice up to 100 MB
    # (50 MB/file), Export, Legacy now permitted!
    can_voice_now, _ = assert_can_upload_media(
        memorial.id, MediaKind.VOICE, 5 * 1024 * 1024, db_session
    )
    assert can_voice_now is True

    # Audio file > 50 MB rejected to prevent arbitrary WAV dumps
    can_huge_voice, huge_voice_msg = assert_can_upload_media(
        memorial.id, MediaKind.VOICE, 55 * 1024 * 1024, db_session
    )
    assert can_huge_voice is False
    assert "Audio file size exceeds the maximum allowed limit of 50 MB" in huge_voice_msg

    # Photo 4 now permitted on Memorial Care (which supports up to 30 photos)
    can_care_photo, _ = assert_can_upload_media(
        memorial.id,
        MediaKind.PHOTO,
        8 * 1024 * 1024,
        db_session,  # 8 MB file (<10 MB)
    )
    assert can_care_photo is True

    # 12 MB file (>10 MB) still rejected on Paid
    can_care_huge, huge_msg = assert_can_upload_media(
        memorial.id, MediaKind.PHOTO, 12 * 1024 * 1024, db_session
    )
    assert can_care_huge is False
    assert "exceeds the maximum allowed limit of 10 MB per file" in huge_msg

    can_export_now, _ = assert_can_export_archive(memorial.id, db_session)
    assert can_export_now is True

    can_legacy_now, _ = assert_can_manage_legacy_links(memorial.id, db_session)
    assert can_legacy_now is True


def test_family_sponsorship_workflow(db_session, make_user, make_memorial):
    """Verify that family sponsorship generates shareable link and public details."""
    creator = make_user(name="Owner")
    memorial = make_memorial(steward=creator, full_name="Ancestor Memorial")

    from app.billing.schemas import CreateSponsorshipRequest

    sponsorship = create_family_sponsorship_link(
        creator,
        CreateSponsorshipRequest(planPriceId="memorial_care_annual_v1", memorialId=memorial.id),
        db_session,
    )

    assert sponsorship.token is not None
    assert "/sponsor/" in sponsorship.shareable_url
    assert sponsorship.amount_minor == 99900

    # Public inquiry
    info = get_sponsorship_info(sponsorship.token, db_session)
    assert info["memorialName"] == "Ancestor Memorial"
    assert info["amountMinor"] == 99900
    assert info["currency"] == "INR"


def test_admin_manual_grant_extend_revoke_lifecycle(db_session, make_user, make_memorial):
    """Privileged Admin Control: Grant complimentary access, extend duration, and revoke."""
    admin = make_user(name="Admin Officer", role="admin")
    customer = make_user(name="Pravin Mathew", email="pravin.mathew@example.com")
    memorial = make_memorial(steward=customer, full_name="Beloved Mother", premium=False)

    # 1. Admin Grant 12 months complimentary Memorial Care
    grant_req = AdminGrantEntitlementRequest(
        targetUserEmail="pravin.mathew@example.com",
        planCode="MEMORIAL_CARE",
        durationMonths=12,
        reason="Compassionate bereavement grant after support review",
        memorialId=memorial.id,
    )
    grant_res = admin_grant_entitlement(admin, grant_req, db_session)

    assert grant_res.status == SubscriptionStatus.ACTIVE
    assert grant_res.source == "ADMIN_GRANT"
    assert grant_res.plan_code == PlanCode.MEMORIAL_CARE
    assert grant_res.assigned_memorial_id == memorial.id

    # Verify subscription in database
    sub = db_session.execute(
        select(Subscription).where(Subscription.id == grant_res.subscription_id)
    ).scalar_one()
    assert sub.status == SubscriptionStatus.ACTIVE
    assert sub.gateway == "admin_grant"
    assert sub.auto_renew is False
    assert sub.entitlements.max_photos == 30
    assert sub.entitlements.max_media_bytes == 300 * 1024 * 1024
    assert sub.entitlements.max_audio_bytes == 100 * 1024 * 1024

    # Verify $0 complimentary invoice was generated for accounting
    inv = db_session.execute(select(Invoice).where(Invoice.subscription_id == sub.id)).scalar_one()
    assert inv.amount_minor == 0
    assert inv.status == "paid"
    assert inv.invoice_number.startswith("PITH-COMP-")

    # 2. Admin Extend Subscription by 6 months
    old_end = sub.current_period_end
    extend_req = AdminExtendSubscriptionRequest(
        additionalMonths=6,
        reason="Family partnership extension",
    )
    extend_res = admin_extend_subscription(admin, sub.id, extend_req, db_session)
    assert extend_res.status == SubscriptionStatus.ACTIVE
    assert extend_res.current_period_end > old_end

    # 3. Admin Revoke Subscription
    revoke_req = AdminRevokeSubscriptionRequest(
        reason="Customer requested transition back to standard tier",
    )
    revoke_res = admin_revoke_subscription(admin, sub.id, revoke_req, db_session)
    assert revoke_res.status == SubscriptionStatus.CANCELLED

    # CRITICAL: Memorial data is never destroyed on admin revoke!
    db_session.refresh(memorial)
    assert memorial.deleted_at is None
    assert memorial.full_name == "Beloved Mother"


def test_admin_billing_overview(db_session, make_user, make_memorial):
    """Verify admin billing overview aggregates accounts, subscriptions, and revenue."""
    admin = make_user(role="admin")
    customer = make_user(email="buyer@example.com")
    memorial = make_memorial(steward=customer)

    order = create_order(
        customer,
        CreateOrderRequest(planPriceId="memorial_care_annual_v1", memorialId=memorial.id),
        db_session,
    )
    verify_and_activate_payment(
        customer, VerifyPaymentRequest(internalOrderId=order.internal_order_id), db_session
    )

    overview = admin_get_billing_overview(admin, db_session)
    assert overview["metrics"]["activeSubscriptions"] >= 1
    assert overview["metrics"]["totalRevenueMinor"] >= 99900
    assert len(overview["recentPayments"]) >= 1
    assert len(overview["recentSubscriptions"]) >= 1
