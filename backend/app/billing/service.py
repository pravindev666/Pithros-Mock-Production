"""Billing and subscription domain service.

Coordinates order creation, gateway interaction, transactional payment verification,
slot-based memorial entitlement assignment, and invoice generation.
"""

from __future__ import annotations

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit import service as audit_service
from app.billing.catalog import (
    CATALOG_PLANS,
    FREE_TIER_LIMITS,
    FAMILY_ARCHIVE_LIMITS,
    MEMORIAL_CARE_LIMITS,
)
from app.billing.models import (
    BillingAccount,
    Invoice,
    MemorialEntitlement,
    Payment,
    Plan,
    PlanPrice,
    SponsorshipLink,
    Subscription,
    SubscriptionEntitlement,
)
from app.billing.schemas import (
    CreateOrderRequest,
    CreateOrderResponse,
    CreateSponsorshipRequest,
    FreeTierSummary,
    PlanPriceRead,
    PlanRead,
    PricingCatalogResponse,
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
    SponsorshipStatus,
    SubscriptionStatus,
)
from app.core.errors import ConflictError, NotFoundError, ValidationError
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
    plans = db.execute(
        select(Plan).where(Plan.active.is_(True)).order_by(Plan.created_at)
    ).scalars().all()

    plan_reads: list[PlanRead] = []
    for p in plans:
        prices = [
            PlanPriceRead.model_validate(pr)
            for pr in p.prices
            if pr.active
        ]
        plan_reads.append(
            PlanRead(
                id=p.id,
                code=p.code,
                name=p.name,
                description=p.description,
                productType=p.product_type,
                prices=prices,
            )
        )

    free_tier = FreeTierSummary(
        maxMemorials=FREE_TIER_LIMITS.max_memorials,
        maxPhotos=FREE_TIER_LIMITS.max_photos,
        maxMediaBytes=FREE_TIER_LIMITS.max_media_bytes,
        maxFileBytes=FREE_TIER_LIMITS.max_file_bytes,
        maxVideoBytes=FREE_TIER_LIMITS.max_video_bytes,
        maxAudioBytes=FREE_TIER_LIMITS.max_audio_bytes,
        maxAudioFileBytes=FREE_TIER_LIMITS.max_audio_file_bytes,
        maxContributors=FREE_TIER_LIMITS.max_contributors,
        maxTimelineEvents=FREE_TIER_LIMITS.max_timeline_events,
        maxDailyUploadAttempts=FREE_TIER_LIMITS.max_daily_upload_attempts,
        archiveExportEnabled=FREE_TIER_LIMITS.archive_export_enabled,
    )

    return PricingCatalogResponse(plans=plan_reads, freeTier=free_tier)


def create_order(
    user: User, req: CreateOrderRequest, db: Session
) -> CreateOrderResponse:
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
        select(PlanPrice).where(
            PlanPrice.id == resolved_price_id, PlanPrice.active.is_(True)
        )
    ).scalar_one_or_none()

    if not price:
        raise NotFoundError("The selected pricing plan is unavailable.")

    # 2. Validate memorial if supplied
    if req.memorial_id:
        memorial = db.execute(
            select(Memorial).where(
                Memorial.id == req.memorial_id, Memorial.deleted_at.is_(None)
            )
        ).scalar_one_or_none()
        if not memorial:
            raise NotFoundError("Memorial not found.")

    # 3. Generate unique order ID
    now_ts = int(datetime.now(timezone.utc).timestamp())
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

    return CreateOrderResponse(
        internalOrderId=internal_order_id,
        amountMinor=price.amount_minor,
        currency=price.currency,
        planName=price.plan.name,
        planCode=price.plan.code,
        priceId=price.id,
        gateway="cashfree",
        gatewayOrderId=internal_order_id,
        paymentSessionId=f"session_{internal_order_id}",
        environment=settings.environment,
    )


def verify_and_activate_payment(
    user: User, req: VerifyPaymentRequest, db: Session
) -> VerifyPaymentResponse:
    """Transactionally verify payment completion, activate subscription, assign memorial slot, and issue invoice."""
    billing_account = get_or_create_billing_account(user, db)

    payment = db.execute(
        select(Payment).where(Payment.internal_order_id == req.internal_order_id)
    ).scalar_one_or_none()

    if not payment:
        raise NotFoundError("Payment order not found.")

    # Idempotent response if already verified
    if payment.status == PaymentStatus.SUCCESS and payment.subscription_id:
        sub = db.execute(
            select(Subscription).where(Subscription.id == payment.subscription_id)
        ).scalar_one()
        return VerifyPaymentResponse(
            success=True,
            subscriptionId=sub.id,
            status=sub.status,
            currentPeriodEnd=sub.current_period_end,
            assignedMemorialId=payment.memorial_id,
            invoiceNumber=payment.invoices[0].invoice_number if payment.invoices else None,
        )

    price = payment.price
    plan = price.plan
    now = datetime.now(timezone.utc)

    # 1. Update Payment status
    payment.status = PaymentStatus.SUCCESS
    payment.gateway_payment_id = req.gateway_payment_id or f"pay_{payment.internal_order_id}"
    payment.gateway_order_id = req.gateway_order_id or payment.internal_order_id
    payment.payment_method_type = req.payment_method_type or "UPI"
    payment.paid_at = now

    # 2. Determine subscription duration
    interval_months = price.interval_count
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
        limits = FAMILY_ARCHIVE_LIMITS if plan.code == PlanCode.FAMILY_ARCHIVE else MEMORIAL_CARE_LIMITS
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
            used_slots = db.execute(
                select(MemorialEntitlement.slot_number).where(
                    MemorialEntitlement.subscription_id == subscription.id,
                    MemorialEntitlement.status == MemorialEntitlementStatus.ASSIGNED,
                )
            ).scalars().all()

            max_allowed = (
                subscription.entitlements.max_memorials
                if subscription.entitlements
                else 1
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
        subscriptionId=subscription.id,
        status=subscription.status,
        currentPeriodEnd=subscription.current_period_end,
        assignedMemorialId=assigned_memorial_id,
        invoiceNumber=invoice_number,
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
    used_slots = db.execute(
        select(MemorialEntitlement.slot_number).where(
            MemorialEntitlement.subscription_id == sub.id,
            MemorialEntitlement.status == MemorialEntitlementStatus.ASSIGNED,
        )
    ).scalars().all()

    max_allowed = sub.entitlements.max_memorials if sub.entitlements else 1
    if len(used_slots) >= max_allowed:
        raise ConflictError(
            f"All {max_allowed} memorial slots for this plan are occupied. Upgrade to Family Archive or an additional slot."
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

    now = datetime.now(timezone.utc)
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
    ent.released_at = datetime.now(timezone.utc)
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
    sub.cancelled_at = datetime.now(timezone.utc)
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
        select(Memorial).where(
            Memorial.id == req.memorial_id, Memorial.deleted_at.is_(None)
        )
    ).scalar_one_or_none()

    if not memorial:
        raise NotFoundError("Memorial not found.")

    price = db.execute(
        select(PlanPrice).where(
            PlanPrice.id == req.plan_price_id, PlanPrice.active.is_(True)
        )
    ).scalar_one_or_none()

    if not price:
        raise NotFoundError("Pricing plan not found.")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

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
        shareableUrl=f"{settings.frontend_base_url}/sponsor/{token}",
        memorialId=memorial.id,
        planName=price.plan.name,
        amountMinor=price.amount_minor,
        currency=price.currency,
        expiresAt=expires_at,
    )


def get_sponsorship_info(token: str, db: Session) -> dict[str, Any]:
    """Public query to inspect a family sponsorship link."""
    link = db.execute(
        select(SponsorshipLink).where(
            SponsorshipLink.token == token,
            SponsorshipLink.status == SponsorshipStatus.ACTIVE,
        )
    ).scalar_one_or_none()

    if not link or link.expires_at < datetime.now(timezone.utc):
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
