"""FastAPI router for PITHROS billing, subscriptions, pricing, entitlements,
and family sponsorship."""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, require_admin_role
from app.billing import service
from app.billing.cashfree import verify_webhook_signature
from app.billing.entitlements import (
    resolve_memorial_entitlements,
)
from app.billing.models import (
    Invoice,
    Payment,
    Subscription,
    WebhookEvent,
)
from app.billing.schemas import (
    AdminEntitlementResponse,
    AdminExtendSubscriptionRequest,
    AdminGrantEntitlementRequest,
    AdminRevokeSubscriptionRequest,
    AssignSlotRequest,
    CreateOrderRequest,
    CreateOrderResponse,
    CreateSponsorshipRequest,
    InvoiceRead,
    PaymentRead,
    PricingCatalogResponse,
    RefundRead,
    RefundRequestCreate,
    SponsorshipResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from app.core.database import get_db
from app.core.enums import AdminSubRole, PaymentStatus, WebhookProcessingStatus
from app.users.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Payments"])


@router.get("/plans", response_model=PricingCatalogResponse, summary="Public pricing catalog")
def get_plans(db: Session = Depends(get_db)) -> PricingCatalogResponse:
    """Return active pricing tiers (Memorial Care, Family Archive, Additional Slots)
    and free limits."""
    return service.get_pricing_catalog(db)


@router.get("/me", summary="Current user billing status")
def get_my_billing(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve billing account, subscriptions, slot allocations, and invoices for
    authenticated user."""
    account = service.get_or_create_billing_account(current_user, db)

    subs = (
        db.execute(select(Subscription).where(Subscription.billing_account_id == account.id))
        .scalars()
        .all()
    )

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


@router.post(
    "/orders",
    response_model=CreateOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create checkout order",
)
def create_checkout_order(
    req: CreateOrderRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> CreateOrderResponse:
    """Create a server-authoritative checkout order. Resolves amount strictly from DB."""
    return service.create_order(current_user, req, db)


@router.post(
    "/verify",
    response_model=VerifyPaymentResponse,
    summary="Verify payment and activate entitlements",
)
def verify_payment(
    req: VerifyPaymentRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> VerifyPaymentResponse:
    """Verify order completion, activate subscription, assign memorial slot, and issue invoice."""
    return service.verify_and_activate_payment(current_user, req, db)


@router.post(
    "/subscriptions/{subscription_id}/slots/assign", summary="Assign memorial to subscription slot"
)
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


@router.post(
    "/subscriptions/{subscription_id}/slots/release",
    summary="Release memorial from subscription slot",
)
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


@router.post(
    "/sponsorship", response_model=SponsorshipResponse, summary="Create family sponsorship link"
)
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
    invoices = (
        db.execute(
            select(Invoice)
            .where(Invoice.billing_account_id == account.id)
            .order_by(Invoice.issued_at.desc())
        )
        .scalars()
        .all()
    )
    return [service.invoice_to_read(inv) for inv in invoices]


@router.get(
    "/invoices/{invoice_number}",
    response_model=InvoiceRead,
    summary="Get one invoice / tax receipt by number",
)
def get_invoice(
    invoice_number: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> InvoiceRead:
    """A single invoice, scoped to the caller's own billing account."""
    return service.get_invoice_for_user(current_user, invoice_number, db)


@router.post(
    "/payments/{payment_id}/refund-request",
    response_model=RefundRead,
    summary="Request a refund for one of your own payments",
)
def request_refund(
    payment_id: uuid.UUID,
    req: RefundRequestCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> RefundRead:
    """Create a PENDING refund for admin action. Money moves only on approval."""
    return service.request_own_refund(current_user, payment_id, req.reason, db)


@router.get(
    "/payments",
    response_model=list[PaymentRead],
    summary="List the caller's own payments",
)
def list_my_payments(current_user: CurrentUser, db: Session = Depends(get_db)) -> list[PaymentRead]:
    """Requester-scoped payment history for the signed-in account."""
    return service.list_own_payments(current_user, db)


@router.post("/webhooks/cashfree", summary="Secure Cashfree webhook receiver")
async def cashfree_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Authoritative webhook processor.

    Cashfree's signature is verified over `timestamp + raw body` *before* anything
    in the payload is read, and fulfilment itself re-confirms the payment with the
    gateway. An unsigned or badly signed request is refused, never fulfilled.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-webhook-signature")
    timestamp = request.headers.get("x-webhook-timestamp")

    if not verify_webhook_signature(raw_body=raw_body, timestamp=timestamp, signature=signature):
        logger.warning("cashfree_webhook_rejected", extra={"reason": "invalid_signature"})

        from app.audit.service import record_independently
        from app.core.enums import AuditAction, AuditResult

        record_independently(
            action=AuditAction.PAYMENT_FAILED,
            entity="webhook_event",
            result=AuditResult.DENIED,
            actor_label="cashfree",
            detail={"reason": "invalid_signature"},
        )
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        data = json.loads(raw_body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from None

    payload_hash = hashlib.sha256(raw_body).hexdigest()
    event_id = request.headers.get("x-webhook-id") or data.get("event_id") or payload_hash[:32]
    event_type = data.get("type", "PAYMENT_NOTIFICATION")

    # 1. Idempotency check: Reject duplicate webhook processing
    existing_event = db.execute(
        select(WebhookEvent).where(WebhookEvent.event_id == event_id)
    ).scalar_one_or_none()

    if existing_event and existing_event.processing_status == WebhookProcessingStatus.PROCESSED:
        logger.info("webhook_duplicate_ignored", extra={"event_id": event_id})
        return {"status": "already_processed"}

    # 2. Record incoming webhook event — the signature really was verified above.
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
    order_data = data.get("data", {}).get("order", {})
    order_id = order_data.get("order_id")

    if (
        event_type
        in ("PAYMENT_SUCCESS_WEBHOOK", "SUBSCRIPTION_STATUS_CHANGE", "PAYMENT_NOTIFICATION")
        and order_id
    ):
        payment = db.execute(
            select(Payment).where(Payment.internal_order_id == order_id)
        ).scalar_one_or_none()

        if payment and payment.status != PaymentStatus.SUCCESS:
            # Activation re-confirms with the gateway, so a signed event alone is
            # never treated as proof that money moved.
            from app.core.errors import AppError

            try:
                service.verify_and_activate_payment(
                    payment.billing_account.owner_user,
                    VerifyPaymentRequest(
                        internal_order_id=order_id,
                        gateway_payment_id=(
                            data.get("data", {}).get("payment", {}).get("cf_payment_id")
                        ),
                        payment_method_type="UPI",
                    ),
                    db,
                )
            except AppError as exc:
                logger.warning(
                    "cashfree_webhook_activation_deferred",
                    extra={"code": exc.code, "event_id": event_id},
                )
                existing_event.processing_status = WebhookProcessingStatus.FAILED
                db.commit()
                return {"status": "deferred"}

    existing_event.processing_status = WebhookProcessingStatus.PROCESSED
    db.commit()

    return {"status": "ok"}


AdminUserDep = Annotated[
    User,
    Depends(require_admin_role(AdminSubRole.SUPER_ADMIN, AdminSubRole.ADMIN, AdminSubRole.FINANCE)),
]


@router.post(
    "/admin/grant",
    response_model=AdminEntitlementResponse,
    summary="Admin manual grant entitlement",
)
def admin_grant(
    req: AdminGrantEntitlementRequest,
    admin_user: AdminUserDep,
    db: Session = Depends(get_db),
) -> AdminEntitlementResponse:
    """Privileged admin operation: manually grant complimentary preservation access
    with explicit audit logging."""
    return service.admin_grant_entitlement(admin_user, req, db)


@router.post(
    "/admin/subscriptions/{subscription_id}/extend",
    response_model=AdminEntitlementResponse,
    summary="Admin extend subscription",
)
def admin_extend(
    subscription_id: uuid.UUID,
    req: AdminExtendSubscriptionRequest,
    admin_user: AdminUserDep,
    db: Session = Depends(get_db),
) -> AdminEntitlementResponse:
    """Privileged admin operation: extend subscription duration."""
    return service.admin_extend_subscription(admin_user, subscription_id, req, db)


@router.post(
    "/admin/subscriptions/{subscription_id}/revoke",
    response_model=AdminEntitlementResponse,
    summary="Admin revoke subscription",
)
def admin_revoke(
    subscription_id: uuid.UUID,
    req: AdminRevokeSubscriptionRequest,
    admin_user: AdminUserDep,
    db: Session = Depends(get_db),
) -> AdminEntitlementResponse:
    """Privileged admin operation: revoke subscription while strictly preserving all
    user memorial data."""
    return service.admin_revoke_subscription(admin_user, subscription_id, req, db)


@router.get(
    "/admin/refunds",
    response_model=list[RefundRead],
    summary="Admin refund queue",
)
def admin_list_refunds(
    admin_user: AdminUserDep,
    db: Session = Depends(get_db),
) -> list[RefundRead]:
    """Privileged: every refund record, newest first, for the admin queue."""
    return service.list_refunds_for_admin(db)


@router.post("/admin/payments/{payment_id}/refunds", summary="Admin requests a refund")
def admin_request_refund(
    payment_id: uuid.UUID,
    body: dict[str, Any],
    admin_user: AdminUserDep,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Privileged admin operation: open a refund request against a paid order."""
    refund = service.admin_request_refund(
        admin_user,
        payment_id,
        body.get("amountMinor"),
        body.get("reason") or "Refund issued by administration.",
        db,
    )
    db.commit()
    return {
        "id": str(refund.id),
        "status": refund.status,
        "amountMinor": refund.amount_minor,
    }


@router.post("/admin/refunds/{refund_id}/approve", summary="Admin approves and issues a refund")
def admin_approve_refund(
    refund_id: uuid.UUID,
    admin_user: AdminUserDep,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Privileged admin operation: issue the refund at the gateway and record it."""
    refund = service.admin_approve_refund(admin_user, refund_id, db)
    db.commit()
    return {
        "id": str(refund.id),
        "status": refund.status,
        "gatewayRefundId": refund.gateway_refund_id,
    }


@router.get("/admin/overview", summary="Admin billing and financial overview")
def admin_overview(
    admin_user: AdminUserDep,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Privileged financial overview: transaction ledger, subscription counts, and
    active revenue."""
    return service.admin_get_billing_overview(admin_user, db)
