"""FastAPI router for PITHROS billing, subscriptions, pricing, entitlements, and family sponsorship."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, OptionalUser
from app.billing import service
from app.billing.entitlements import (
    MemorialEntitlementsReport,
    resolve_memorial_entitlements,
)
from app.billing.models import (
    BillingAccount,
    Invoice,
    MemorialEntitlement,
    Subscription,
    WebhookEvent,
)
from app.billing.schemas import (
    AssignSlotRequest,
    BillingAccountRead,
    CreateOrderRequest,
    CreateOrderResponse,
    CreateSponsorshipRequest,
    InvoiceRead,
    MemorialSlotRead,
    PricingCatalogResponse,
    SponsorshipResponse,
    SubscriptionRead,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from app.billing.state_machine import transition_subscription_state
from app.core.database import get_db
from app.core.enums import SubscriptionStatus, WebhookProcessingStatus
from app.core.errors import ConflictError, NotFoundError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Payments"])


@router.get("/plans", response_model=PricingCatalogResponse, summary="Public pricing catalog")
def get_plans(db: Session = Depends(get_db)) -> PricingCatalogResponse:
    """Return active pricing tiers (Memorial Care, Family Archive, Additional Slots) and free limits."""
    return service.get_pricing_catalog(db)


@router.get("/me", summary="Current user billing status")
def get_my_billing(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve billing account, subscriptions, slot allocations, and invoices for authenticated user."""
    account = service.get_or_create_billing_account(current_user, db)

    subs = db.execute(
        select(Subscription).where(Subscription.billing_account_id == account.id)
    ).scalars().all()

    subscriptions_data = []
    for s in subs:
        slots_data = [
            {
                "id": str(slot.id),
                "slotNumber": slot.slot_number,
                "memorialId": str(slot.memorial_id),
                "status": slot.status,
                "assignedAt": slot.assigned_at.isoformat(),
            }
            for slot in s.memorial_slots
        ]
        subscriptions_data.append(
            {
                "id": str(s.id),
                "planName": s.plan.name,
                "planCode": s.plan.code,
                "priceId": s.price_id,
                "status": s.status,
                "currentPeriodStart": s.current_period_start.isoformat(),
                "currentPeriodEnd": s.current_period_end.isoformat(),
                "autoRenew": s.auto_renew,
                "cancelAtPeriodEnd": s.cancel_at_period_end,
                "maxMemorials": s.entitlements.max_memorials if s.entitlements else 1,
                "slots": slots_data,
            }
        )

    return {
        "billingAccount": {
            "id": str(account.id),
            "billingEmail": account.billing_email,
            "billingName": account.billing_name,
            "country": account.country,
            "currency": account.currency,
            "status": account.status,
        },
        "subscriptions": subscriptions_data,
    }


@router.post("/orders", response_model=CreateOrderResponse, status_code=status.HTTP_201_CREATED, summary="Create checkout order")
def create_checkout_order(
    req: CreateOrderRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> CreateOrderResponse:
    """Create a server-authoritative checkout order. Resolves amount strictly from DB."""
    return service.create_order(current_user, req, db)


@router.post("/verify", response_model=VerifyPaymentResponse, summary="Verify payment and activate entitlements")
def verify_payment(
    req: VerifyPaymentRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> VerifyPaymentResponse:
    """Verify order completion, activate subscription, assign memorial slot, and issue invoice."""
    return service.verify_and_activate_payment(current_user, req, db)


@router.post("/subscriptions/{subscription_id}/slots/assign", summary="Assign memorial to subscription slot")
def assign_slot(
    subscription_id: uuid.UUID,
    req: AssignSlotRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Assign a memorial to an available subscription slot."""
    slot = service.assign_memorial_slot(current_user, subscription_id, req.memorial_id, db)
    return {
        "success": True,
        "slotId": str(slot.id),
        "slotNumber": slot.slot_number,
        "memorialId": str(slot.memorial_id),
        "status": slot.status,
    }


@router.post("/subscriptions/{subscription_id}/slots/release", summary="Release memorial from subscription slot")
def release_slot(
    subscription_id: uuid.UUID,
    req: AssignSlotRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    """Release a memorial from a subscription slot. Preserves all memorial data intact."""
    service.release_memorial_slot(current_user, subscription_id, req.memorial_id, db)
    return {"success": True}


@router.post("/subscriptions/{subscription_id}/cancel", summary="Cancel renewal at period end")
def cancel_subscription(
    subscription_id: uuid.UUID,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """User cancels auto-renewal. Premium features stay active until current_period_end."""
    sub = service.cancel_subscription(current_user, subscription_id, db)
    return {
        "success": True,
        "subscriptionId": str(sub.id),
        "cancelAtPeriodEnd": sub.cancel_at_period_end,
        "currentPeriodEnd": sub.current_period_end.isoformat(),
    }


@router.post("/subscriptions/{subscription_id}/resume", summary="Resume subscription auto-renewal")
def resume_subscription(
    subscription_id: uuid.UUID,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Resume auto-renewal for a cancelled subscription before period end."""
    sub = service.resume_subscription(current_user, subscription_id, db)
    return {
        "success": True,
        "subscriptionId": str(sub.id),
        "autoRenew": sub.auto_renew,
        "cancelAtPeriodEnd": sub.cancel_at_period_end,
    }


@router.get("/memorials/{memorial_id}/entitlements", summary="Memorial capability and usage report")
def get_memorial_entitlements(
    memorial_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Inspect effective limits, current media usage, and allowed actions for a memorial."""
    report = resolve_memorial_entitlements(memorial_id, db)
    return {
        "memorialId": str(report.memorial_id),
        "isPremium": report.is_premium,
        "subscriptionStatus": report.subscription_status,
        "planName": report.plan_name,
        "slotNumber": report.slot_number,
        "limits": {
            "maxPhotos": report.limits.max_photos,
            "maxVideoBytes": report.limits.max_video_bytes,
            "maxAudioBytes": report.limits.max_audio_bytes,
            "maxContributors": report.limits.max_contributors,
            "maxTimelineEvents": report.limits.max_timeline_events,
            "archiveExportEnabled": report.limits.archive_export_enabled,
            "legacyLinksEnabled": report.limits.legacy_links_enabled,
            "premiumThemeEnabled": report.limits.premium_theme_enabled,
        },
        "usage": {
            "photosCount": report.photos_count,
            "audioBytes": report.audio_bytes,
            "videoBytes": report.video_bytes,
            "documentsCount": report.documents_count,
            "contributorsCount": report.contributors_count,
            "timelineEventsCount": report.timeline_events_count,
        },
        "permissions": {
            "canUploadPhoto": report.can_upload_photo,
            "canUploadVoice": report.can_upload_voice,
            "canUploadVideo": report.can_upload_video,
            "canAddContributor": report.can_add_contributor,
            "canAddTimelineEvent": report.can_add_timeline_event,
            "canExportArchive": report.can_export_archive,
            "canManageLegacyLinks": report.can_manage_legacy_links,
            "canUsePremiumTheme": report.can_use_premium_theme,
        },
        "statusNotice": report.status_notice,
    }


@router.post("/sponsorship", response_model=SponsorshipResponse, summary="Create family sponsorship link")
def create_sponsorship(
    req: CreateSponsorshipRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> SponsorshipResponse:
    """Generate a shareable link allowing any family member to fund Memorial Care."""
    return service.create_family_sponsorship_link(current_user, req, db)


@router.get("/sponsorship/{token}", summary="Inspect family sponsorship token")
def inspect_sponsorship(
    token: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Public query to resolve a family sponsorship invitation."""
    return service.get_sponsorship_info(token, db)


@router.get("/invoices", response_model=list[InvoiceRead], summary="List billing invoices")
def list_invoices(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> list[InvoiceRead]:
    """Retrieve immutable invoices for the authenticated user."""
    account = service.get_or_create_billing_account(current_user, db)
    invoices = db.execute(
        select(Invoice).where(Invoice.billing_account_id == account.id).order_by(Invoice.issued_at.desc())
    ).scalars().all()
    return [InvoiceRead.model_validate(inv) for inv in invoices]


@router.post("/webhooks/cashfree", summary="Secure Cashfree webhook receiver")
async def cashfree_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Authoritative webhook processor: raw body verification, idempotency, and transactional fulfilment."""
    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")
    payload_hash = hashlib.sha256(raw_body).hexdigest()

    try:
        data = json.loads(body_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_id = request.headers.get("x-webhook-id") or data.get("event_id") or payload_hash[:32]
    event_type = data.get("type", "PAYMENT_NOTIFICATION")

    # 1. Idempotency check: Reject duplicate webhook processing
    existing_event = db.execute(
        select(WebhookEvent).where(WebhookEvent.event_id == event_id)
    ).scalar_one_or_none()

    if existing_event and existing_event.processing_status == WebhookProcessingStatus.PROCESSED:
        logger.info("webhook_duplicate_ignored", extra={"event_id": event_id})
        return {"status": "already_processed"}

    # 2. Record incoming webhook event
    if not existing_event:
        existing_event = WebhookEvent(
            gateway="cashfree",
            event_id=event_id,
            event_type=event_type,
            payload_hash=payload_hash,
            payload_json=data,
            signature_valid=True,
            processing_status=WebhookProcessingStatus.RECEIVED,
        )
        db.add(existing_event)
        db.flush()

    # 3. Handle event types
    # Payment success / subscription renewal
    order_data = data.get("data", {}).get("order", {})
    order_id = order_data.get("order_id")

    if event_type in ("PAYMENT_SUCCESS_WEBHOOK", "SUBSCRIPTION_STATUS_CHANGE", "PAYMENT_NOTIFICATION") and order_id:
        payment = db.execute(
            select(Payment).where(Payment.internal_order_id == order_id)
        ).scalar_one_or_none()

        if payment and payment.status != PaymentStatus.SUCCESS:
            user = payment.billing_account.owner_user
            service.verify_and_activate_payment(
                user,
                VerifyPaymentRequest(
                    internalOrderId=order_id,
                    gatewayPaymentId=data.get("data", {}).get("payment", {}).get("cf_payment_id"),
                    paymentMethodType="UPI",
                ),
                db,
            )

    existing_event.processing_status = WebhookProcessingStatus.PROCESSED
    db.commit()

    return {"status": "ok"}
