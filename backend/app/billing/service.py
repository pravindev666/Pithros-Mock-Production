"""Billing and subscription domain service.

Coordinates order creation, gateway interaction, transactional payment verification,
slot-based memorial entitlement assignment, and invoice generation.
"""

from __future__ import annotations

import logging
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import service as audit_service
from app.billing.catalog import (
    FAMILY_ARCHIVE_LIMITS,
    FREE_TIER_LIMITS,
    MEMORIAL_CARE_LIMITS,
)
from app.billing.models import (
    BillingAccount,
    Invoice,
    MemorialEntitlement,
    Payment,
    Plan,
    PlanPrice,
    Refund,
    SponsorshipLink,
    Subscription,
    SubscriptionEntitlement,
)
from app.billing.schemas import (
    AdminEntitlementResponse,
    AdminExtendSubscriptionRequest,
    AdminGrantEntitlementRequest,
    AdminRevokeSubscriptionRequest,
    CreateOrderRequest,
    CreateOrderResponse,
    CreateSponsorshipRequest,
    FreeTierSummary,
    InvoiceRead,
    PaymentRead,
    PlanPriceRead,
    PlanRead,
    PricingCatalogResponse,
    RefundRead,
    SponsorshipResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from app.billing.state_machine import transition_subscription_state
from app.core.config import settings
from app.core.enums import (
    AuditAction,
    AuditResult,
    BillingInterval,
    InvoiceStatus,
    MemorialEntitlementStatus,
    PaymentStatus,
    PlanCode,
    RefundStatus,
    SponsorshipStatus,
    SubscriptionStatus,
)
from app.core.errors import ConflictError, NotFoundError
from app.memorials.models import Memorial
from app.users.models import User

logger = logging.getLogger(__name__)


def get_or_create_billing_account(user: User, db: Session) -> BillingAccount:
    """Resolve or initialize the user's BillingAccount entity."""
    account = db.execute(
        select(BillingAccount).where(BillingAccount.owner_user_id == user.id)
    ).scalar_one_or_none()

    if not account:
        account = BillingAccount(
            owner_user_id=user.id,
            billing_email=user.email,
            billing_name=user.name or user.email.split("@")[0],
            country="IN",
            currency="INR",
            status="active",
        )
        db.add(account)
        db.flush()
        logger.info("billing_account_created", extra={"user_id": str(user.id)})

    return account


def get_pricing_catalog(db: Session) -> PricingCatalogResponse:
    """Return all active plans and prices with verified savings copy."""
    plans = (
        db.execute(select(Plan).where(Plan.active.is_(True)).order_by(Plan.created_at))
        .scalars()
        .all()
    )

    plan_reads: list[PlanRead] = []
    for p in plans:
        prices = [PlanPriceRead.model_validate(pr) for pr in p.prices if pr.active]
        plan_reads.append(
            PlanRead(
                id=p.id,
                code=p.code,
                name=p.name,
                description=p.description,
                product_type=p.product_type,
                prices=prices,
            )
        )

    free_tier = FreeTierSummary(
        max_memorials=FREE_TIER_LIMITS.max_memorials,
        max_photos=FREE_TIER_LIMITS.max_photos,
        max_media_bytes=FREE_TIER_LIMITS.max_media_bytes,
        max_file_bytes=FREE_TIER_LIMITS.max_file_bytes,
        max_video_bytes=FREE_TIER_LIMITS.max_video_bytes,
        max_audio_bytes=FREE_TIER_LIMITS.max_audio_bytes,
        max_audio_file_bytes=FREE_TIER_LIMITS.max_audio_file_bytes,
        max_contributors=FREE_TIER_LIMITS.max_contributors,
        max_timeline_events=FREE_TIER_LIMITS.max_timeline_events,
        max_daily_upload_attempts=FREE_TIER_LIMITS.max_daily_upload_attempts,
        archive_export_enabled=FREE_TIER_LIMITS.archive_export_enabled,
    )

    return PricingCatalogResponse(plans=plan_reads, free_tier=free_tier)


def create_order(user: User, req: CreateOrderRequest, db: Session) -> CreateOrderResponse:
    """Create a server-authoritative checkout order for a plan price.
    Amount is strictly determined server-side from plan_prices.
    """
    billing_account = get_or_create_billing_account(user, db)

    PRICE_ALIASES = {
        "plan_care_monthly": "memorial_care_monthly_v1",
        "plan_care_half_yearly": "memorial_care_half_yearly_v1",
        "plan_care_annual": "memorial_care_annual_v1",
        "plan_archive": "family_archive_annual_v1",
        "plan_plus": "memorial_care_annual_v1",
    }
    resolved_price_id = PRICE_ALIASES.get(req.plan_price_id, req.plan_price_id)

    # 1. Resolve price from DB strictly (no client amounts allowed)
    price = db.execute(
        select(PlanPrice).where(PlanPrice.id == resolved_price_id, PlanPrice.active.is_(True))
    ).scalar_one_or_none()

    if not price:
        raise NotFoundError("The selected pricing plan is unavailable.")

    # 2. Validate memorial if supplied
    if req.memorial_id:
        memorial = db.execute(
            select(Memorial).where(Memorial.id == req.memorial_id, Memorial.deleted_at.is_(None))
        ).scalar_one_or_none()
        if not memorial:
            raise NotFoundError("Memorial not found.")

    # 3. Generate unique order ID
    now_ts = int(datetime.now(UTC).timestamp())
    order_suffix = secrets.token_hex(4).upper()
    internal_order_id = f"PITH-ORD-{now_ts}-{order_suffix}"

    # 4. Create pending payment record
    payment = Payment(
        billing_account_id=billing_account.id,
        plan_price_id=price.id,
        memorial_id=req.memorial_id,
        internal_order_id=internal_order_id,
        gateway="cashfree",
        amount_minor=price.amount_minor,
        currency=price.currency,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    db.flush()

    audit_service.record(
        db,
        action=AuditAction.PAYMENT_ATTEMPTED,
        entity="payment",
        entity_id=payment.id,
        actor=user,
        result=AuditResult.SUCCESS,
        detail={
            "internal_order_id": internal_order_id,
            "amount_minor": price.amount_minor,
            "price_id": price.id,
            "memorial_id": str(req.memorial_id) if req.memorial_id else None,
        },
    )

    db.commit()

    # The checkout SDK needs a real session id from the gateway. With no
    # credentials configured this raises rather than inventing one.
    from app.billing.cashfree import CashfreeClient

    client = CashfreeClient.from_settings()
    gateway_order = client.create_order(
        order_id=internal_order_id,
        amount_minor=price.amount_minor,
        currency=price.currency,
        customer_id=str(user.id),
        notify_url=(
            f"{settings.app_base_url.rstrip('/')}{settings.api_v1_prefix}/billing/webhooks/cashfree"
        ),
    )
    payment.gateway_order_id = str(gateway_order.get("cf_order_id") or internal_order_id)
    db.commit()

    return CreateOrderResponse(
        internal_order_id=internal_order_id,
        amount_minor=price.amount_minor,
        currency=price.currency,
        plan_name=price.plan.name,
        plan_code=price.plan.code,
        price_id=price.id,
        gateway="cashfree",
        gateway_order_id=internal_order_id,
        payment_session_id=str(gateway_order.get("payment_session_id") or ""),
        environment=settings.environment,
    )


def verify_and_activate_payment(
    user: User, req: VerifyPaymentRequest, db: Session
) -> VerifyPaymentResponse:
    """Transactionally verify payment completion, activate subscription, assign
    memorial slot, and issue invoice."""
    billing_account = get_or_create_billing_account(user, db)

    payment = db.execute(
        select(Payment).where(Payment.internal_order_id == req.internal_order_id)
    ).scalar_one_or_none()

    if not payment:
        raise NotFoundError("Payment order not found.")

    # An order belongs to exactly one family; no other account may settle it.
    if payment.billing_account.owner_user.id != user.id:
        raise NotFoundError("Payment order not found.")

    # Idempotent response if already verified
    if payment.status == PaymentStatus.SUCCESS and payment.subscription_id:
        sub = db.execute(
            select(Subscription).where(Subscription.id == payment.subscription_id)
        ).scalar_one()
        return VerifyPaymentResponse(
            success=True,
            subscription_id=sub.id,
            status=sub.status,
            current_period_end=sub.current_period_end,
            assigned_memorial_id=payment.memorial_id,
            invoice_number=payment.invoices[0].invoice_number if payment.invoices else None,
        )

    # Money is real only if the gateway says so, for the recorded amount. This is
    # the check a browser payload can never satisfy on its own.
    from app.billing.cashfree import CashfreeClient

    client = CashfreeClient.from_settings()
    confirmed = client.confirm_paid_order(
        order_id=payment.internal_order_id,
        expected_amount_minor=payment.amount_minor,
    )
    req = req.model_copy(
        update={
            "gateway_payment_id": confirmed.cf_payment_id or req.gateway_payment_id,
            "payment_method_type": confirmed.payment_method or req.payment_method_type,
        }
    )

    price = payment.price
    plan = price.plan
    now = datetime.now(UTC)

    # 1. Update Payment status
    payment.status = PaymentStatus.SUCCESS
    # Only ever store the gateway's own identifier. If neither the gateway nor the
    # caller supplied one, leave it null rather than inventing a plausible-looking id.
    payment.gateway_payment_id = req.gateway_payment_id or None
    payment.gateway_order_id = req.gateway_order_id or payment.internal_order_id
    payment.payment_method_type = req.payment_method_type or "UPI"
    payment.paid_at = now

    # 2. Determine subscription duration
    if price.billing_interval == BillingInterval.ANNUAL:
        duration = timedelta(days=365)
    elif price.billing_interval == BillingInterval.HALF_YEARLY:
        duration = timedelta(days=182)
    else:
        duration = timedelta(days=30)

    # 3. Find or create subscription
    existing_sub = db.execute(
        select(Subscription).where(
            Subscription.billing_account_id == billing_account.id,
            Subscription.plan_id == plan.id,
            Subscription.status.in_(
                [
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.PAST_DUE,
                    SubscriptionStatus.GRACE,
                ]
            ),
        )
    ).scalar_one_or_none()

    if existing_sub:
        # Extend current period
        new_end = max(existing_sub.current_period_end, now) + duration
        existing_sub = transition_subscription_state(
            existing_sub,
            SubscriptionStatus.ACTIVE,
            reason="Successful payment renewal",
            db=db,
            actor_id=user.id,
            extend_period_until=new_end,
        )
        subscription = existing_sub
    else:
        # Create new subscription
        subscription = Subscription(
            billing_account_id=billing_account.id,
            plan_id=plan.id,
            price_id=price.id,
            status=SubscriptionStatus.ACTIVE,
            gateway="cashfree",
            current_period_start=now,
            current_period_end=now + duration,
            auto_renew=True,
        )
        db.add(subscription)
        db.flush()

        # Create subscription entitlements
        limits = (
            FAMILY_ARCHIVE_LIMITS if plan.code == PlanCode.FAMILY_ARCHIVE else MEMORIAL_CARE_LIMITS
        )
        entitlement = SubscriptionEntitlement(
            subscription_id=subscription.id,
            max_memorials=limits.max_memorials,
            max_photos=limits.max_photos,
            max_media_bytes=limits.max_media_bytes,
            max_file_bytes=limits.max_file_bytes,
            max_video_bytes=limits.max_video_bytes,
            max_audio_bytes=limits.max_audio_bytes,
            max_audio_file_bytes=limits.max_audio_file_bytes,
            max_documents=limits.max_documents,
            max_contributors=limits.max_contributors,
            max_timeline_events=limits.max_timeline_events,
            max_daily_upload_attempts=limits.max_daily_upload_attempts,
            verification_enabled=limits.verification_enabled,
            archive_export_enabled=limits.archive_export_enabled,
            anniversary_notifications_enabled=limits.anniversary_notifications_enabled,
            legacy_links_enabled=limits.legacy_links_enabled,
            premium_theme_enabled=limits.premium_theme_enabled,
        )
        db.add(entitlement)
        db.flush()

    payment.subscription_id = subscription.id

    # 4. Slot Allocation: If a memorial was specified, assign to an open slot
    assigned_memorial_id = None
    if payment.memorial_id:
        existing_slot = db.execute(
            select(MemorialEntitlement).where(
                MemorialEntitlement.subscription_id == subscription.id,
                MemorialEntitlement.memorial_id == payment.memorial_id,
                MemorialEntitlement.status == MemorialEntitlementStatus.ASSIGNED,
            )
        ).scalar_one_or_none()

        if not existing_slot:
            # Determine next slot number
            used_slots = (
                db.execute(
                    select(MemorialEntitlement.slot_number).where(
                        MemorialEntitlement.subscription_id == subscription.id,
                        MemorialEntitlement.status == MemorialEntitlementStatus.ASSIGNED,
                    )
                )
                .scalars()
                .all()
            )

            max_allowed = (
                subscription.entitlements.max_memorials if subscription.entitlements else 1
            )
            for slot_num in range(1, max_allowed + 1):
                if slot_num not in used_slots:
                    existing_slot_row = db.execute(
                        select(MemorialEntitlement).where(
                            MemorialEntitlement.subscription_id == subscription.id,
                            MemorialEntitlement.slot_number == slot_num,
                        )
                    ).scalar_one_or_none()

                    if existing_slot_row:
                        existing_slot_row.memorial_id = payment.memorial_id
                        existing_slot_row.status = MemorialEntitlementStatus.ASSIGNED
                        existing_slot_row.assigned_at = now
                        existing_slot_row.released_at = None
                    else:
                        new_slot = MemorialEntitlement(
                            billing_account_id=billing_account.id,
                            subscription_id=subscription.id,
                            memorial_id=payment.memorial_id,
                            slot_number=slot_num,
                            status=MemorialEntitlementStatus.ASSIGNED,
                        )
                        db.add(new_slot)
                    assigned_memorial_id = payment.memorial_id
                    break

    # 5. Generate immutable Invoice
    invoice_number = f"PITH-INV-{now.strftime('%Y%m')}-{secrets.token_hex(3).upper()}"
    invoice = Invoice(
        billing_account_id=billing_account.id,
        subscription_id=subscription.id,
        payment_id=payment.id,
        invoice_number=invoice_number,
        amount_minor=payment.amount_minor,
        tax_minor=0,
        total_minor=payment.amount_minor,
        currency=payment.currency,
        status=InvoiceStatus.PAID,
        issued_at=now,
        paid_at=now,
    )
    db.add(invoice)

    # 6. Audit logs
    audit_service.record(
        db,
        action=AuditAction.PAYMENT_CONFIRMED,
        entity="payment",
        entity_id=payment.id,
        actor=user,
        result=AuditResult.SUCCESS,
        detail={
            "invoice_number": invoice_number,
            "subscription_id": str(subscription.id),
            "amount_minor": payment.amount_minor,
        },
    )

    db.commit()

    return VerifyPaymentResponse(
        success=True,
        subscription_id=subscription.id,
        status=subscription.status,
        current_period_end=subscription.current_period_end,
        assigned_memorial_id=assigned_memorial_id,
        invoice_number=invoice_number,
    )


def assign_memorial_slot(
    user: User, subscription_id: uuid.UUID, memorial_id: uuid.UUID, db: Session
) -> MemorialEntitlement:
    """Explicitly assign a memorial to an available subscription slot."""
    billing_account = get_or_create_billing_account(user, db)

    sub = db.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.billing_account_id == billing_account.id,
        )
    ).scalar_one_or_none()

    if not sub:
        raise NotFoundError("Subscription not found.")

    if sub.status not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE):
        raise ConflictError("Memorial slots can only be assigned on active subscriptions.")

    # The memorial must belong to this family. Without this check a user could bind
    # another family's memorial to their own plan and inherit premium entitlements
    # on a memorial they do not steward.
    from app.memorials.models import Memorial, MemorialSteward

    memorial_exists = db.execute(
        select(Memorial.id).where(Memorial.id == memorial_id, Memorial.deleted_at.is_(None))
    ).scalar_one_or_none()
    membership = db.execute(
        select(MemorialSteward.id).where(
            MemorialSteward.memorial_id == memorial_id,
            MemorialSteward.user_id == user.id,
        )
    ).scalar_one_or_none()
    if memorial_exists is None or membership is None:
        # 404 rather than 403: whether that memorial exists is not the caller's business.
        raise NotFoundError("Memorial not found.")

    # Check if already assigned
    existing = db.execute(
        select(MemorialEntitlement).where(
            MemorialEntitlement.subscription_id == sub.id,
            MemorialEntitlement.memorial_id == memorial_id,
            MemorialEntitlement.status == MemorialEntitlementStatus.ASSIGNED,
        )
    ).scalar_one_or_none()

    if existing:
        return existing

    # Check capacity
    used_slots = (
        db.execute(
            select(MemorialEntitlement.slot_number).where(
                MemorialEntitlement.subscription_id == sub.id,
                MemorialEntitlement.status == MemorialEntitlementStatus.ASSIGNED,
            )
        )
        .scalars()
        .all()
    )

    max_allowed = sub.entitlements.max_memorials if sub.entitlements else 1
    if len(used_slots) >= max_allowed:
        raise ConflictError(
            f"All {max_allowed} memorial slots for this plan are occupied. "
            "Upgrade to Family Archive or an additional slot."
        )

    # Find first vacant slot number
    chosen_slot = None
    for slot_num in range(1, max_allowed + 1):
        if slot_num not in used_slots:
            chosen_slot = slot_num
            break

    existing_slot_row = db.execute(
        select(MemorialEntitlement).where(
            MemorialEntitlement.subscription_id == sub.id,
            MemorialEntitlement.slot_number == chosen_slot,
        )
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    if existing_slot_row:
        ent = existing_slot_row
        ent.memorial_id = memorial_id
        ent.status = MemorialEntitlementStatus.ASSIGNED
        ent.assigned_at = now
        ent.released_at = None
    else:
        ent = MemorialEntitlement(
            billing_account_id=billing_account.id,
            subscription_id=sub.id,
            memorial_id=memorial_id,
            slot_number=chosen_slot,
            status=MemorialEntitlementStatus.ASSIGNED,
        )
        db.add(ent)
    db.commit()

    audit_service.record(
        db,
        action=AuditAction.MEMORIAL_SLOT_ASSIGNED,
        entity="memorial",
        entity_id=memorial_id,
        actor=user,
        result=AuditResult.SUCCESS,
        detail={"subscription_id": str(sub.id), "slot_number": chosen_slot},
    )

    return ent


def release_memorial_slot(
    user: User, subscription_id: uuid.UUID, memorial_id: uuid.UUID, db: Session
) -> None:
    """Release a memorial from a subscription slot. Never deletes the memorial."""
    billing_account = get_or_create_billing_account(user, db)

    ent = db.execute(
        select(MemorialEntitlement).where(
            MemorialEntitlement.subscription_id == subscription_id,
            MemorialEntitlement.billing_account_id == billing_account.id,
            MemorialEntitlement.memorial_id == memorial_id,
            MemorialEntitlement.status == MemorialEntitlementStatus.ASSIGNED,
        )
    ).scalar_one_or_none()

    if not ent:
        raise NotFoundError("Memorial slot assignment not found.")

    ent.status = MemorialEntitlementStatus.RELEASED
    ent.released_at = datetime.now(UTC)
    db.commit()

    audit_service.record(
        db,
        action=AuditAction.MEMORIAL_SLOT_RELEASED,
        entity="memorial",
        entity_id=memorial_id,
        actor=user,
        result=AuditResult.SUCCESS,
        detail={"subscription_id": str(subscription_id), "slot_number": ent.slot_number},
    )


def cancel_subscription(user: User, subscription_id: uuid.UUID, db: Session) -> Subscription:
    """User-initiated disablement of auto-renewal. Premium access stays active until period end."""
    billing_account = get_or_create_billing_account(user, db)

    sub = db.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.billing_account_id == billing_account.id,
        )
    ).scalar_one_or_none()

    if not sub:
        raise NotFoundError("Subscription not found.")

    sub.cancel_at_period_end = True
    sub.auto_renew = False
    sub.cancelled_at = datetime.now(UTC)
    db.commit()

    audit_service.record(
        db,
        action=AuditAction.SUBSCRIPTION_CANCELLED,
        entity="subscription",
        entity_id=sub.id,
        actor=user,
        result=AuditResult.SUCCESS,
        detail={"period_end": sub.current_period_end.isoformat()},
    )

    return sub


def resume_subscription(user: User, subscription_id: uuid.UUID, db: Session) -> Subscription:
    """Resume auto-renewal before period end."""
    billing_account = get_or_create_billing_account(user, db)

    sub = db.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.billing_account_id == billing_account.id,
        )
    ).scalar_one_or_none()

    if not sub:
        raise NotFoundError("Subscription not found.")

    sub.cancel_at_period_end = False
    sub.auto_renew = True
    sub.cancelled_at = None
    db.commit()

    return sub


def create_family_sponsorship_link(
    user: User, req: CreateSponsorshipRequest, db: Session
) -> SponsorshipResponse:
    """Generate a shareable family sponsorship link for any relative to pay for Memorial Care."""
    memorial = db.execute(
        select(Memorial).where(Memorial.id == req.memorial_id, Memorial.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not memorial:
        raise NotFoundError("Memorial not found.")

    price = db.execute(
        select(PlanPrice).where(PlanPrice.id == req.plan_price_id, PlanPrice.active.is_(True))
    ).scalar_one_or_none()

    if not price:
        raise NotFoundError("Pricing plan not found.")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=30)

    link = SponsorshipLink(
        memorial_id=memorial.id,
        created_by_user_id=user.id,
        plan_price_id=price.id,
        token=token,
        status=SponsorshipStatus.ACTIVE,
        expires_at=expires_at,
    )
    db.add(link)
    db.commit()

    audit_service.record(
        db,
        action=AuditAction.SPONSORSHIP_CREATED,
        entity="memorial",
        entity_id=memorial.id,
        actor=user,
        result=AuditResult.SUCCESS,
        detail={"token": token, "price_id": price.id},
    )

    return SponsorshipResponse(
        token=token,
        shareable_url=f"{settings.frontend_base_url}/sponsor/{token}",
        memorial_id=memorial.id,
        plan_name=price.plan.name,
        amount_minor=price.amount_minor,
        currency=price.currency,
        expires_at=expires_at,
    )


def get_sponsorship_info(token: str, db: Session) -> dict[str, Any]:
    """Public query to inspect a family sponsorship link."""
    link = db.execute(
        select(SponsorshipLink).where(
            SponsorshipLink.token == token,
            SponsorshipLink.status == SponsorshipStatus.ACTIVE,
        )
    ).scalar_one_or_none()

    if not link or link.expires_at < datetime.now(UTC):
        raise NotFoundError("Sponsorship link is expired or invalid.")

    memorial = link.memorial
    price = link.price

    return {
        "token": link.token,
        "memorialId": str(memorial.id),
        "memorialName": memorial.full_name,
        "planName": price.plan.name,
        "priceId": price.id,
        "amountMinor": price.amount_minor,
        "currency": price.currency,
        "billingInterval": price.billing_interval,
        "expiresAt": link.expires_at.isoformat(),
    }


def admin_grant_entitlement(
    admin_user: User, req: AdminGrantEntitlementRequest, db: Session
) -> AdminEntitlementResponse:
    """Privileged admin operation: manually grant or extend a paid preservation
    entitlement. Enforces strict audit logging and converges directly onto the
    authoritative PostgreSQL subscription engine.
    """
    now = datetime.now(UTC)

    # 1. Resolve target user
    target_user: User | None = None
    if req.target_user_id:
        target_user = db.execute(
            select(User).where(User.id == req.target_user_id)
        ).scalar_one_or_none()
    elif req.target_user_email:
        target_user = db.execute(
            select(User).where(User.email == req.target_user_email.strip().lower())
        ).scalar_one_or_none()

    if not target_user:
        raise NotFoundError("Target user not found.")

    # 2. Resolve target plan
    plan_code_map = {
        "MEMORIAL_CARE": PlanCode.MEMORIAL_CARE,
        "FAMILY_ARCHIVE": PlanCode.FAMILY_ARCHIVE,
        "ADDITIONAL_MEMORIAL": PlanCode.ADDITIONAL_MEMORIAL,
        "plan_care_annual": PlanCode.MEMORIAL_CARE,
        "plan_archive": PlanCode.FAMILY_ARCHIVE,
    }
    normalized_code = plan_code_map.get(req.plan_code, req.plan_code)
    plan = db.execute(
        select(Plan).where(Plan.code == normalized_code, Plan.active.is_(True))
    ).scalar_one_or_none()

    if not plan:
        raise NotFoundError(f"Preservation plan '{req.plan_code}' not found.")

    # 3. Resolve primary plan price for reference
    primary_price = (
        db.execute(
            select(PlanPrice)
            .where(
                PlanPrice.plan_id == plan.id,
                PlanPrice.active.is_(True),
            )
            .order_by(PlanPrice.is_primary.desc())
        )
        .scalars()
        .first()
    )

    if not primary_price:
        raise NotFoundError("Plan has no active prices configured.")

    # 4. Resolve or initialize target user's billing account
    billing_account = get_or_create_billing_account(target_user, db)

    # 5. Check if active subscription already exists for this plan
    existing_sub = db.execute(
        select(Subscription).where(
            Subscription.billing_account_id == billing_account.id,
            Subscription.plan_id == plan.id,
            Subscription.status.in_(
                [
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.PAST_DUE,
                    SubscriptionStatus.GRACE,
                ]
            ),
        )
    ).scalar_one_or_none()

    duration = timedelta(days=req.duration_months * 30)

    if existing_sub:
        # Extend current period safely
        new_end = max(existing_sub.current_period_end, now) + duration
        existing_sub = transition_subscription_state(
            existing_sub,
            SubscriptionStatus.ACTIVE,
            reason=f"Admin complimentary grant extension: {req.reason}",
            db=db,
            actor_id=admin_user.id,
            extend_period_until=new_end,
        )
        subscription = existing_sub
    else:
        # Create fresh complimentary subscription
        subscription = Subscription(
            billing_account_id=billing_account.id,
            plan_id=plan.id,
            price_id=primary_price.id,
            status=SubscriptionStatus.ACTIVE,
            gateway="admin_grant",
            gateway_subscription_id=f"adm_grant_{uuid.uuid4().hex[:12]}",
            current_period_start=now,
            current_period_end=now + duration,
            auto_renew=False,  # Complimentary grants do not recurringly charge
        )
        db.add(subscription)
        db.flush()

        # Seed limits
        limits = (
            FAMILY_ARCHIVE_LIMITS if plan.code == PlanCode.FAMILY_ARCHIVE else MEMORIAL_CARE_LIMITS
        )
        entitlement = SubscriptionEntitlement(
            subscription_id=subscription.id,
            max_memorials=limits.max_memorials,
            max_photos=limits.max_photos,
            max_media_bytes=limits.max_media_bytes,
            max_file_bytes=limits.max_file_bytes,
            max_video_bytes=limits.max_video_bytes,
            max_audio_bytes=limits.max_audio_bytes,
            max_audio_file_bytes=limits.max_audio_file_bytes,
            max_documents=limits.max_documents,
            max_contributors=limits.max_contributors,
            max_timeline_events=limits.max_timeline_events,
            max_daily_upload_attempts=limits.max_daily_upload_attempts,
            verification_enabled=limits.verification_enabled,
            archive_export_enabled=limits.archive_export_enabled,
            anniversary_notifications_enabled=limits.anniversary_notifications_enabled,
            legacy_links_enabled=limits.legacy_links_enabled,
            premium_theme_enabled=limits.premium_theme_enabled,
        )
        db.add(entitlement)
        db.flush()

    # 6. Assign memorial slot if requested
    assigned_mem_id = None
    if req.memorial_id:
        memorial = db.execute(
            select(Memorial).where(
                Memorial.id == req.memorial_id,
                Memorial.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if memorial:
            slot = assign_memorial_slot(target_user, subscription.id, memorial.id, db)
            assigned_mem_id = slot.memorial_id

    # 7. Generate $0 complimentary audit invoice
    invoice_number = f"PITH-COMP-{now.strftime('%Y%m')}-{secrets.token_hex(3).upper()}"
    comp_invoice = Invoice(
        billing_account_id=billing_account.id,
        subscription_id=subscription.id,
        payment_id=None,
        invoice_number=invoice_number,
        amount_minor=0,
        tax_minor=0,
        total_minor=0,
        currency="INR",
        status=InvoiceStatus.PAID,
        issued_at=now,
        paid_at=now,
    )
    db.add(comp_invoice)

    # 8. Immutable audit record
    audit_service.record(
        db,
        action=AuditAction.ADMIN_ENTITLEMENT_GRANTED,
        entity="subscription",
        entity_id=subscription.id,
        actor=admin_user,
        result=AuditResult.SUCCESS,
        detail={
            "target_user_id": str(target_user.id),
            "target_user_email": target_user.email,
            "plan_code": plan.code,
            "duration_months": req.duration_months,
            "reason": req.reason,
            "source": "ADMIN_GRANT",
            "invoice_number": invoice_number,
        },
    )

    db.commit()

    return AdminEntitlementResponse(
        subscription_id=subscription.id,
        status=subscription.status,
        plan_code=plan.code,
        plan_name=plan.name,
        source="ADMIN_GRANT",
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        max_memorials=subscription.entitlements.max_memorials if subscription.entitlements else 1,
        assigned_memorial_id=assigned_mem_id,
        message=(
            f"Complimentary preservation access ({req.duration_months} months) "
            f"successfully granted to {target_user.email}."
        ),
    )


def admin_extend_subscription(
    admin_user: User, subscription_id: uuid.UUID, req: AdminExtendSubscriptionRequest, db: Session
) -> AdminEntitlementResponse:
    """Privileged admin operation: extend the active period of an existing subscription."""
    now = datetime.now(UTC)
    sub = db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    ).scalar_one_or_none()

    if not sub:
        raise NotFoundError("Subscription not found.")

    new_end = max(sub.current_period_end, now) + timedelta(days=req.additional_months * 30)
    sub = transition_subscription_state(
        sub,
        SubscriptionStatus.ACTIVE,
        reason=f"Admin extension: {req.reason}",
        db=db,
        actor_id=admin_user.id,
        extend_period_until=new_end,
    )

    audit_service.record(
        db,
        action=AuditAction.ADMIN_ENTITLEMENT_EXTENDED,
        entity="subscription",
        entity_id=sub.id,
        actor=admin_user,
        result=AuditResult.SUCCESS,
        detail={
            "additional_months": req.additional_months,
            "new_period_end": sub.current_period_end.isoformat(),
            "reason": req.reason,
            "source": "ADMIN_GRANT",
        },
    )

    db.commit()

    return AdminEntitlementResponse(
        subscription_id=sub.id,
        status=sub.status,
        plan_code=sub.plan.code,
        plan_name=sub.plan.name,
        source=sub.gateway,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        max_memorials=sub.entitlements.max_memorials if sub.entitlements else 1,
        assigned_memorial_id=sub.memorial_slots[0].memorial_id if sub.memorial_slots else None,
        message=(
            f"Subscription extended by {req.additional_months} months until "
            f"{sub.current_period_end.strftime('%d %b %Y')}."
        ),
    )


def admin_revoke_subscription(
    admin_user: User, subscription_id: uuid.UUID, req: AdminRevokeSubscriptionRequest, db: Session
) -> AdminEntitlementResponse:
    """Privileged admin operation: revoke an entitlement early.
    Strictly preserves all user media and memorials — switches status to
    EXPIRED_READ_ONLY or CANCELLED.
    """
    sub = db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    ).scalar_one_or_none()

    if not sub:
        raise NotFoundError("Subscription not found.")

    sub = transition_subscription_state(
        sub,
        SubscriptionStatus.CANCELLED,
        reason=f"Admin revoked: {req.reason}",
        db=db,
        actor_id=admin_user.id,
    )

    # Release any active slots, but NEVER delete the memorial
    for slot in sub.memorial_slots:
        slot.status = MemorialEntitlementStatus.RELEASED
        slot.released_at = datetime.now(UTC)

    audit_service.record(
        db,
        action=AuditAction.ADMIN_ENTITLEMENT_REVOKED,
        entity="subscription",
        entity_id=sub.id,
        actor=admin_user,
        result=AuditResult.SUCCESS,
        detail={"reason": req.reason, "source": "ADMIN_GRANT"},
    )

    db.commit()

    return AdminEntitlementResponse(
        subscription_id=sub.id,
        status=sub.status,
        plan_code=sub.plan.code,
        plan_name=sub.plan.name,
        source=sub.gateway,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        max_memorials=sub.entitlements.max_memorials if sub.entitlements else 1,
        assigned_memorial_id=None,
        message="Subscription revoked. Memorial data is safely preserved in read-only state.",
    )


def admin_request_refund(
    admin_user: User,
    payment_id: uuid.UUID,
    amount_minor: int | None,
    reason: str,
    db: Session,
) -> Any:
    """Record a refund request. No money moves until it is approved."""
    from app.billing.models import Refund
    from app.core.enums import RefundStatus
    from app.core.errors import ConflictError, ValidationError

    payment = db.execute(select(Payment).where(Payment.id == payment_id)).scalar_one_or_none()
    if not payment:
        raise NotFoundError("Payment not found.")
    if payment.status != PaymentStatus.SUCCESS:
        raise ConflictError("Only a successful payment can be refunded.")

    amount = amount_minor or payment.amount_minor
    if amount <= 0 or amount > payment.amount_minor:
        raise ValidationError("The refund amount is not valid for this payment.")

    refund = Refund(
        payment_id=payment.id,
        amount_minor=amount,
        currency=payment.currency,
        status=RefundStatus.PENDING.value,
        reason=reason,
        requested_by=admin_user.id,
    )
    db.add(refund)
    db.flush()

    audit_service.record(
        db,
        action=AuditAction.REFUND_REQUESTED,
        entity="refund",
        entity_id=refund.id,
        actor=admin_user,
        result=AuditResult.SUCCESS,
        detail={
            "paymentId": str(payment.id),
            "internalOrderId": payment.internal_order_id,
            "amountMinor": amount,
            "reason": reason,
        },
    )
    db.flush()
    return refund


def admin_approve_refund(admin_user: User, refund_id: uuid.UUID, db: Session) -> Any:
    """Issue the refund at the gateway and record what actually happened.

    A gateway failure is persisted as a failed refund — never reported as success.
    """
    from app.billing.cashfree import CashfreeClient, PaymentGatewayError
    from app.billing.models import Refund
    from app.core.enums import RefundStatus
    from app.core.errors import ConflictError

    refund = db.execute(select(Refund).where(Refund.id == refund_id)).scalar_one_or_none()
    if not refund:
        raise NotFoundError("Refund not found.")
    if refund.status != RefundStatus.PENDING.value:
        raise ConflictError("That refund has already been processed.")

    payment = db.execute(select(Payment).where(Payment.id == refund.payment_id)).scalar_one()

    client = CashfreeClient.from_settings()
    try:
        result = client.create_refund(
            order_id=payment.internal_order_id,
            refund_id=str(refund.id),
            amount_minor=refund.amount_minor,
            note=refund.reason,
        )
    except PaymentGatewayError:
        refund.status = RefundStatus.FAILED.value
        audit_service.record(
            db,
            action=AuditAction.REFUND_APPROVED,
            entity="refund",
            entity_id=refund.id,
            actor=admin_user,
            result=AuditResult.FLAGGED,
            detail={"paymentId": str(payment.id), "reason": "gateway_rejected"},
        )
        db.flush()
        raise

    refund.status = RefundStatus.PROCESSED.value
    # Keep only the gateway's identifier; never substitute our own row id for it.
    gateway_refund_id = result.get("cf_refund_id") or result.get("refund_id")
    refund.gateway_refund_id = str(gateway_refund_id) if gateway_refund_id else None
    refund.approved_by = admin_user.id
    if refund.amount_minor >= payment.amount_minor:
        payment.status = PaymentStatus.REFUNDED

    audit_service.record(
        db,
        action=AuditAction.REFUND_APPROVED,
        entity="refund",
        entity_id=refund.id,
        actor=admin_user,
        result=AuditResult.SUCCESS,
        detail={
            "paymentId": str(payment.id),
            "amountMinor": refund.amount_minor,
            "gatewayRefundId": refund.gateway_refund_id,
        },
    )
    db.flush()
    return refund


def admin_get_billing_overview(admin_user: User, db: Session) -> dict[str, Any]:
    """Privileged financial and entitlement overview for admin control plane."""
    total_accounts = db.execute(select(func.count(BillingAccount.id))).scalar() or 0
    active_subscriptions = (
        db.execute(
            select(func.count(Subscription.id)).where(
                Subscription.status == SubscriptionStatus.ACTIVE
            )
        ).scalar()
        or 0
    )
    total_payments_count = db.execute(select(func.count(Payment.id))).scalar() or 0
    total_revenue_minor = (
        db.execute(
            select(func.coalesce(func.sum(Payment.amount_minor), 0)).where(
                Payment.status == PaymentStatus.SUCCESS
            )
        ).scalar()
        or 0
    )

    # Recent payments
    payments = (
        db.execute(select(Payment).order_by(Payment.created_at.desc()).limit(20)).scalars().all()
    )
    payments_data = [
        {
            "id": str(p.id),
            "internalOrderId": p.internal_order_id,
            "gateway": p.gateway,
            "gatewayOrderId": p.gateway_order_id,
            "amountMinor": p.amount_minor,
            "currency": p.currency,
            "status": p.status,
            "planPriceId": p.plan_price_id,
            "userEmail": p.billing_account.owner_user.email,
            "userName": p.billing_account.owner_user.name,
            "memorialId": str(p.memorial_id) if p.memorial_id else None,
            "createdAt": p.created_at.isoformat(),
            "paidAt": p.paid_at.isoformat() if p.paid_at else None,
        }
        for p in payments
    ]

    # Recent subscriptions
    subs = (
        db.execute(select(Subscription).order_by(Subscription.created_at.desc()).limit(20))
        .scalars()
        .all()
    )
    subs_data = [
        {
            "id": str(s.id),
            "userEmail": s.billing_account.owner_user.email,
            "userName": s.billing_account.owner_user.name,
            "planName": s.plan.name,
            "planCode": s.plan.code,
            "status": s.status,
            "gateway": s.gateway,
            "currentPeriodStart": s.current_period_start.isoformat(),
            "currentPeriodEnd": s.current_period_end.isoformat(),
            "maxMemorials": s.entitlements.max_memorials if s.entitlements else 1,
            "assignedMemorialsCount": len(
                [
                    slot
                    for slot in s.memorial_slots
                    if slot.status == MemorialEntitlementStatus.ASSIGNED
                ]
            ),
        }
        for s in subs
    ]

    return {
        "metrics": {
            "totalAccounts": total_accounts,
            "activeSubscriptions": active_subscriptions,
            "totalPaymentsCount": total_payments_count,
            "totalRevenueMinor": total_revenue_minor,
            "currency": "INR",
        },
        "recentPayments": payments_data,
        "recentSubscriptions": subs_data,
    }


def invoice_to_read(invoice: Invoice) -> InvoiceRead:
    """Project an Invoice row into the receipt shape, deriving display fields."""
    plan_name: str | None = None
    if invoice.subscription is not None and invoice.subscription.plan is not None:
        plan_name = invoice.subscription.plan.name
    elif invoice.payment is not None and invoice.payment.price is not None:
        plan_name = invoice.payment.price.plan.name

    memorial_name: str | None = None
    payment_method: str | None = None
    if invoice.payment is not None:
        if invoice.payment.memorial is not None:
            memorial_name = invoice.payment.memorial.full_name
        payment_method = (
            invoice.payment.payment_method_masked or invoice.payment.payment_method_type
        )

    billing_name: str | None = None
    billing_email: str | None = None
    if invoice.billing_account is not None:
        billing_name = invoice.billing_account.billing_name
        billing_email = invoice.billing_account.billing_email

    return InvoiceRead(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        amount_minor=invoice.amount_minor,
        tax_minor=invoice.tax_minor,
        total_minor=invoice.total_minor,
        currency=invoice.currency,
        status=invoice.status,
        issued_at=invoice.issued_at,
        paid_at=invoice.paid_at,
        plan_name=plan_name,
        memorial_name=memorial_name,
        billing_name=billing_name,
        billing_email=billing_email,
        payment_method_masked=payment_method,
        pdf_url=None,
    )


def get_invoice_for_user(user: User, invoice_number: str, db: Session) -> InvoiceRead:
    """A single invoice, scoped to the caller's own billing account."""
    account = get_or_create_billing_account(user, db)
    invoice = db.execute(
        select(Invoice).where(
            Invoice.invoice_number == invoice_number,
            Invoice.billing_account_id == account.id,
        )
    ).scalar_one_or_none()
    if invoice is None:
        raise NotFoundError("Invoice not found.")
    return invoice_to_read(invoice)


def refund_to_read(refund: Refund) -> RefundRead:
    payment = refund.payment
    owner = payment.billing_account.owner_user if payment and payment.billing_account else None
    return RefundRead(
        id=refund.id,
        payment_id=refund.payment_id,
        internal_order_id=payment.internal_order_id if payment else None,
        user_email=owner.email if owner else None,
        user_name=owner.name if owner else None,
        amount_minor=refund.amount_minor,
        currency=refund.currency,
        status=refund.status,
        reason=refund.reason,
        gateway_refund_id=refund.gateway_refund_id,
        created_at=refund.created_at,
        processed_at=refund.processed_at,
    )


def list_refunds_for_admin(db: Session, *, limit: int = 200) -> list[RefundRead]:
    refunds = (
        db.execute(select(Refund).order_by(Refund.created_at.desc()).limit(limit)).scalars().all()
    )
    return [refund_to_read(refund) for refund in refunds]


def request_own_refund(user: User, payment_id: uuid.UUID, reason: str, db: Session) -> RefundRead:
    """A steward requests a refund for their own successful payment.

    Creates a PENDING refund for an admin to action — money only moves on admin
    approval, so a browser can request but never mint a refund.
    """
    account = get_or_create_billing_account(user, db)
    payment = db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.billing_account_id == account.id,
        )
    ).scalar_one_or_none()
    if payment is None or payment.status != PaymentStatus.SUCCESS:
        raise NotFoundError("Payment not found.")

    existing = db.execute(
        select(Refund).where(
            Refund.payment_id == payment.id,
            Refund.status == RefundStatus.PENDING.value,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return refund_to_read(existing)

    refund = Refund(
        payment_id=payment.id,
        amount_minor=payment.amount_minor,
        currency=payment.currency,
        status=RefundStatus.PENDING.value,
        reason=reason,
        requested_by=user.id,
    )
    db.add(refund)
    db.flush()
    audit_service.record(
        db,
        action=AuditAction.REFUND_REQUESTED,
        entity="refund",
        entity_id=refund.id,
        actor=user,
        detail={"paymentId": str(payment.id), "amountMinor": refund.amount_minor},
    )
    db.commit()
    db.refresh(refund)
    return refund_to_read(refund)


def payment_to_read(payment: Payment) -> PaymentRead:
    return PaymentRead(
        id=payment.id,
        internal_order_id=payment.internal_order_id,
        gateway=payment.gateway,
        gateway_order_id=payment.gateway_order_id,
        gateway_payment_id=payment.gateway_payment_id,
        amount_minor=payment.amount_minor,
        currency=payment.currency,
        status=payment.status,
        plan_name=payment.price.plan.name if payment.price is not None else None,
        memorial_name=payment.memorial.full_name if payment.memorial is not None else None,
        invoice_number=payment.invoices[0].invoice_number if payment.invoices else None,
        created_at=payment.created_at,
        paid_at=payment.paid_at,
    )


def list_own_payments(user: User, db: Session, *, limit: int = 100) -> list[PaymentRead]:
    """Payments belonging to the caller's own billing account, newest first."""
    account = get_or_create_billing_account(user, db)
    payments = (
        db.execute(
            select(Payment)
            .where(Payment.billing_account_id == account.id)
            .order_by(Payment.created_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return [payment_to_read(payment) for payment in payments]
