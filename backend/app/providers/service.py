"""Farewell Network business logic.

Two thin mapping layers live here and nowhere else:

* the partner console and the family view use different labels for the same lead
  state, so both are translated to and from the canonical `LeadStatus`
* media rows are projected into the URL shapes each surface expects

Everything stateful is checked against the enum transition tables, so an
illegal jump is a 409 rather than a silently accepted write.
"""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.audit.service import record as audit_record
from app.core.enums import (
    LEAD_TRANSITIONS,
    AuditAction,
    LeadStatus,
    MediaKind,
    MediaStatus,
    NotificationType,
    ProviderStatus,
    StorageTier,
    VerificationState,
)
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.media.models import MediaItem
from app.media.storage import get_storage
from app.notifications.service import notify, notify_provider_managers
from app.providers.models import (
    FarewellLead,
    Provider,
    ProviderService,
    ProviderVerification,
)
from app.providers.schemas import (
    AdminLeadOut,
    AdminProviderOut,
    LeadCreateIn,
    LeadCreateOut,
    PartnerLeadOut,
    ProviderMediaOut,
    ProviderProfileOut,
    ProviderServiceOut,
    ProviderVerificationOut,
    PublicProviderOut,
    PublicProviderServiceOut,
)
from app.users.models import User

_SLUG_STRIP = re.compile(r"[^a-z0-9]+")

# The partner console's labels.
_PARTNER_LABELS: dict[LeadStatus, str] = {
    LeadStatus.SUBMITTED: "Submitted",
    LeadStatus.CONTACTED: "Provider Contacted",
    LeadStatus.QUOTED: "Quote Received",
    LeadStatus.IN_DISCUSSION: "In Discussion",
    LeadStatus.BOOKED: "Booked",
    LeadStatus.COMPLETED: "Completed",
    LeadStatus.CANCELLED: "Cancelled",
}

# The public/family view's labels.
_FAMILY_LABELS: dict[LeadStatus, str] = {
    LeadStatus.SUBMITTED: "new",
    LeadStatus.CONTACTED: "contacted",
    LeadStatus.QUOTED: "in_service",
    LeadStatus.IN_DISCUSSION: "in_service",
    LeadStatus.BOOKED: "in_service",
    LeadStatus.COMPLETED: "completed",
    LeadStatus.CANCELLED: "cancelled",
}

_ACCEPTED_STATUS_INPUT: dict[str, LeadStatus] = {
    **{status.value: status for status in LeadStatus},
    **{label.lower(): status for status, label in _PARTNER_LABELS.items()},
    **{label.lower(): status for status, label in _FAMILY_LABELS.items()},
}

MAX_GALLERY_PHOTOS = 12
MAX_VERIFICATION_DOCUMENTS = 5


# ─── Slugs ──────────────────────────────────────────────────────────────────


def build_slug(business_name: str) -> str:
    slug = _SLUG_STRIP.sub("-", business_name.strip().lower()).strip("-")
    return slug or "provider"


def unique_slug(db: Session, business_name: str, *, exclude_id: uuid.UUID | None = None) -> str:
    base = build_slug(business_name)
    candidate = base
    suffix = 2
    while True:
        stmt = select(func.count()).select_from(Provider).where(Provider.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(Provider.id != exclude_id)
        if db.scalar(stmt) == 0:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


# ─── Lookups ────────────────────────────────────────────────────────────────


def get_for_owner(db: Session, user: User) -> Provider | None:
    return db.scalar(
        select(Provider).where(
            Provider.owner_user_id == user.id,
            Provider.deleted_at.is_(None),
        )
    )


def get_or_create_for_owner(db: Session, user: User) -> Provider:
    """Provision the partner profile on first access.

    Mirrors how a Firebase identity provisions a Pithros user: the console needs
    something to render, and an empty draft is honest — nothing is published
    until the partner fills it in and an admin approves it.
    """
    existing = get_for_owner(db, user)
    if existing is not None:
        return existing

    provider = Provider(
        owner_user_id=user.id,
        slug=unique_slug(db, user.name or "partner"),
        business_name=user.name or "New partner",
        contact_name=user.name or "",
    )
    db.add(provider)
    db.flush()
    return provider


def require_owner_provider(db: Session, user: User) -> Provider:
    provider = get_for_owner(db, user)
    if provider is None:
        raise NotFoundError("Partner profile not found")
    return provider


def get_public_by_slug(db: Session, slug: str) -> Provider:
    provider = db.scalar(
        select(Provider).where(
            Provider.slug == slug,
            Provider.status == ProviderStatus.APPROVED.value,
            Provider.deleted_at.is_(None),
        )
    )
    if provider is None:
        raise NotFoundError("Provider not found")
    return provider


def get_by_id(db: Session, provider_id: uuid.UUID) -> Provider:
    provider = db.scalar(
        select(Provider).where(Provider.id == provider_id, Provider.deleted_at.is_(None))
    )
    if provider is None:
        raise NotFoundError("Provider not found")
    return provider


# ─── Profile ────────────────────────────────────────────────────────────────


def update_profile(
    db: Session,
    *,
    provider: Provider,
    updates: dict,
    actor: User,
    request: Request | None = None,
) -> Provider:
    for field in (
        "business_name",
        "contact_name",
        "tagline",
        "category",
        "city",
        "description",
        "phone",
        "whatsapp",
        "email",
        "address",
        "operating_hours",
    ):
        value = updates.get(field)
        if value is not None:
            setattr(provider, field, value)

    areas = updates.get("service_areas")
    if areas is not None:
        provider.service_areas = ", ".join(part.strip() for part in areas if part.strip())

    logo_media_id = updates.get("logo_media_id")
    if logo_media_id is not None:
        if logo_media_id == "":
            provider.logo_media_id = None
        else:
            media = db.scalar(
                select(MediaItem).where(
                    MediaItem.id == uuid.UUID(str(logo_media_id)),
                    MediaItem.provider_id == provider.id,
                    MediaItem.deleted_at.is_(None),
                )
            )
            if media is None:
                raise ValidationError("That image does not belong to this profile.")
            provider.logo_media_id = media.id

    if updates.get("business_name"):
        provider.slug = unique_slug(db, provider.business_name, exclude_id=provider.id)

    audit_record(
        db,
        action=AuditAction.PROVIDER_UPDATED,
        entity="providers",
        entity_id=provider.id,
        actor=actor,
        detail={"fields": sorted(updates)},
        request=request,
    )
    db.flush()
    return provider


# ─── Services ───────────────────────────────────────────────────────────────


def list_services(
    db: Session, provider: Provider, *, include_inactive: bool = True
) -> list[ProviderService]:
    stmt = select(ProviderService).where(ProviderService.provider_id == provider.id)
    if not include_inactive:
        stmt = stmt.where(ProviderService.active.is_(True))
    return list(db.scalars(stmt.order_by(ProviderService.sort, ProviderService.created_at)))


def create_service(
    db: Session,
    *,
    provider: Provider,
    payload: dict,
    actor: User,
    request: Request | None = None,
) -> ProviderService:
    service = ProviderService(
        provider_id=provider.id,
        name=payload["name"],
        description=payload.get("description", ""),
        price_note=payload.get("price_note", ""),
        estimated_time=payload.get("estimated_time", ""),
        includes="\n".join(payload.get("includes") or []),
        active=payload.get("active", True),
        sort=payload.get("sort", 0),
    )
    db.add(service)
    audit_record(
        db,
        action=AuditAction.PROVIDER_UPDATED,
        entity="provider_services",
        entity_id=service.id,
        actor=actor,
        detail={"providerId": str(provider.id), "created": True},
        request=request,
    )
    db.flush()
    return service


def get_owned_service(db: Session, provider: Provider, service_id: uuid.UUID) -> ProviderService:
    service = db.scalar(
        select(ProviderService).where(
            ProviderService.id == service_id,
            ProviderService.provider_id == provider.id,
        )
    )
    if service is None:
        raise NotFoundError("Service not found")
    return service


def update_service(
    db: Session,
    *,
    provider: Provider,
    service: ProviderService,
    updates: dict,
    actor: User,
    request: Request | None = None,
) -> ProviderService:
    for field in ("name", "description", "price_note", "estimated_time", "active", "sort"):
        value = updates.get(field)
        if value is not None:
            setattr(service, field, value)
    includes = updates.get("includes")
    if includes is not None:
        service.includes = "\n".join(includes)
    audit_record(
        db,
        action=AuditAction.PROVIDER_UPDATED,
        entity="provider_services",
        entity_id=service.id,
        actor=actor,
        detail={"providerId": str(provider.id), "fields": sorted(updates)},
        request=request,
    )
    db.flush()
    return service


def delete_service(
    db: Session,
    *,
    provider: Provider,
    service: ProviderService,
    actor: User,
    request: Request | None = None,
) -> None:
    db.delete(service)
    audit_record(
        db,
        action=AuditAction.PROVIDER_UPDATED,
        entity="provider_services",
        entity_id=service.id,
        actor=actor,
        detail={"providerId": str(provider.id), "deleted": True},
        request=request,
    )
    db.flush()


# ─── Verification ───────────────────────────────────────────────────────────


def get_verification(db: Session, provider: Provider) -> ProviderVerification | None:
    return db.scalar(
        select(ProviderVerification)
        .where(ProviderVerification.provider_id == provider.id)
        .order_by(ProviderVerification.created_at.desc())
    )


def submit_verification(
    db: Session,
    *,
    provider: Provider,
    actor: User,
    request: Request | None = None,
) -> ProviderVerification:
    documents = list(
        db.scalars(
            select(MediaItem).where(
                MediaItem.provider_id == provider.id,
                MediaItem.kind == MediaKind.DOCUMENT.value,
                MediaItem.status == MediaStatus.READY.value,
                MediaItem.deleted_at.is_(None),
            )
        )
    )
    if not documents:
        raise ValidationError("Upload at least one credential document before submitting.")

    record = get_verification(db, provider)
    if record is None:
        record = ProviderVerification(provider_id=provider.id)
        db.add(record)

    if record.state in (
        VerificationState.SUBMITTED.value,
        VerificationState.VERIFICATION_PENDING.value,
    ):
        raise ConflictError("Your credentials are already with the review team.")
    if record.state == VerificationState.VERIFICATION_REVIEW.value:
        raise ConflictError("Your credentials are already being reviewed.")
    if record.state == VerificationState.APPROVED.value:
        raise ConflictError("Your credentials are already approved.")

    record.state = VerificationState.SUBMITTED.value
    record.submitted_at = datetime.now(UTC)
    record.decision_reason = None
    provider.verification_state = VerificationState.SUBMITTED.value

    audit_record(
        db,
        action=AuditAction.PROVIDER_SUBMITTED,
        entity="providers",
        entity_id=provider.id,
        actor=actor,
        detail={"documents": len(documents)},
        request=request,
    )
    notify_provider_managers(
        db,
        notification_type=NotificationType.VERIFICATION_SUBMITTED,
        title="New partner awaiting review",
        body=f"{provider.business_name} submitted credentials for review.",
        payload={"providerId": str(provider.id)},
    )
    db.flush()
    return record


def decide_verification(
    db: Session,
    *,
    provider: Provider,
    admin: User,
    decision: VerificationState,
    reason: str | None,
    request: Request | None = None,
) -> Provider:
    """Admin decision on credentials. Approval is also what publishes the profile."""
    if decision not in (
        VerificationState.APPROVED,
        VerificationState.REJECTED,
        VerificationState.NEEDS_MORE_INFORMATION,
    ):
        raise ValidationError("That is not a review decision.")

    record = get_verification(db, provider)
    if record is None:
        raise NotFoundError("No verification submission for this provider")

    current = VerificationState(record.state)
    if current not in (
        VerificationState.SUBMITTED,
        VerificationState.VERIFICATION_PENDING,
        VerificationState.VERIFICATION_REVIEW,
    ):
        raise ConflictError("There is nothing awaiting review for this provider.")

    record.state = decision.value
    record.reviewed_at = datetime.now(UTC)
    record.reviewed_by_id = admin.id
    record.decision_reason = reason
    provider.verification_state = decision.value

    if decision == VerificationState.APPROVED:
        provider.status = ProviderStatus.APPROVED.value
        provider.status_reason = None
        provider.approved_at = datetime.now(UTC)
        audit_action = AuditAction.PROVIDER_APPROVED
        title = "Your partner profile is live"
        body = f"{provider.business_name} is now listed in the Farewell Network."
        notification_type = NotificationType.PROVIDER_APPROVED
    elif decision == VerificationState.REJECTED:
        provider.status = ProviderStatus.REJECTED.value
        provider.status_reason = reason
        audit_action = AuditAction.PROVIDER_REJECTED
        title = "Your partner application was declined"
        body = reason or "Your submitted credentials did not meet the platform standard."
        notification_type = NotificationType.PROVIDER_SUSPENDED
    else:
        audit_action = AuditAction.PROVIDER_SUBMITTED
        title = "More information needed for your application"
        body = reason or "The review team needs an additional document."
        notification_type = NotificationType.VERIFICATION_NEEDS_INFO

    audit_record(
        db,
        action=audit_action,
        entity="providers",
        entity_id=provider.id,
        actor=admin,
        detail={"decision": decision.value, "reason": reason},
        request=request,
    )
    notify(
        db,
        user_id=provider.owner_user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        payload={"providerId": str(provider.id), "state": decision.value},
    )
    db.flush()
    return provider


def suspend_provider(
    db: Session,
    *,
    provider: Provider,
    admin: User,
    reason: str | None,
    request: Request | None = None,
) -> Provider:
    if provider.status != ProviderStatus.APPROVED.value:
        raise ConflictError("Only an approved provider can be suspended.")
    provider.status = ProviderStatus.SUSPENDED.value
    provider.status_reason = reason
    audit_record(
        db,
        action=AuditAction.PROVIDER_SUSPENDED,
        entity="providers",
        entity_id=provider.id,
        actor=admin,
        detail={"reason": reason},
        request=request,
    )
    notify(
        db,
        user_id=provider.owner_user_id,
        notification_type=NotificationType.PROVIDER_SUSPENDED,
        title="Your partner listing has been paused",
        body=reason or "A platform administrator paused your listing.",
        payload={"providerId": str(provider.id)},
    )
    db.flush()
    return provider


# ─── Admin listings ─────────────────────────────────────────────────────────


def list_admin_providers(
    db: Session,
    *,
    status_filter: str | None,
    query: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Provider], int]:
    stmt = select(Provider).where(Provider.deleted_at.is_(None))
    if status_filter:
        stmt = stmt.where(Provider.status == status_filter)
    if query:
        like = f"%{query.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Provider.business_name).like(like),
                func.lower(Provider.city).like(like),
                func.lower(Provider.contact_name).like(like),
            )
        )
    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = list(db.scalars(stmt.order_by(Provider.created_at.desc()).limit(limit).offset(offset)))
    return rows, total


def to_admin_provider(db: Session, provider: Provider) -> AdminProviderOut:
    verification = get_verification(db, provider)
    service_count = db.scalar(
        select(func.count())
        .select_from(ProviderService)
        .where(ProviderService.provider_id == provider.id)
    )
    open_leads = db.scalar(
        select(func.count())
        .select_from(FarewellLead)
        .where(
            FarewellLead.provider_id == provider.id,
            FarewellLead.status.notin_([LeadStatus.COMPLETED.value, LeadStatus.CANCELLED.value]),
        )
    )
    return AdminProviderOut(
        id=str(provider.id),
        slug=provider.slug,
        business_name=provider.business_name,
        contact_name=provider.contact_name,
        category=provider.category,
        city=provider.city,
        phone=provider.phone,
        email=provider.email,
        status=provider.status,
        verification_state=provider.verification_state,
        status_reason=provider.status_reason,
        service_count=int(service_count or 0),
        open_lead_count=int(open_leads or 0),
        submitted_at=verification.submitted_at if verification else None,
        created_at=provider.created_at,
    )


def list_admin_leads(
    db: Session,
    *,
    status_filter: str | None,
    limit: int,
    offset: int,
) -> tuple[list[FarewellLead], int]:
    stmt = select(FarewellLead)
    if status_filter:
        stmt = stmt.where(FarewellLead.status == status_filter)
    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    rows = list(
        db.scalars(stmt.order_by(FarewellLead.created_at.desc()).limit(limit).offset(offset))
    )
    return rows, total


def to_admin_lead(db: Session, lead: FarewellLead) -> AdminLeadOut:
    provider = db.get(Provider, lead.provider_id)
    return AdminLeadOut(
        id=str(lead.id),
        provider_id=str(lead.provider_id),
        provider_name=provider.business_name if provider else "",
        contact_name=lead.contact_name,
        contact_phone=lead.contact_phone,
        contact_email=lead.contact_email,
        city=lead.city,
        service_needed=lead.service_needed,
        message=lead.message,
        status=lead.status,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


# ─── Leads ──────────────────────────────────────────────────────────────────


def parse_lead_status(value: str) -> LeadStatus:
    status = _ACCEPTED_STATUS_INPUT.get(value.strip().lower())
    if status is None:
        raise ValidationError("Unknown lead status.")
    return status


def create_lead(
    db: Session,
    *,
    provider: Provider,
    payload: LeadCreateIn,
    requester: User | None,
    request: Request | None = None,
) -> FarewellLead:
    if not provider.is_publicly_visible:
        raise NotFoundError("Provider not found")

    service_id: uuid.UUID | None = None
    if payload.service_id:
        service = db.scalar(
            select(ProviderService).where(
                ProviderService.id == uuid.UUID(payload.service_id),
                ProviderService.provider_id == provider.id,
                ProviderService.active.is_(True),
            )
        )
        if service is None:
            raise ValidationError("That service is not offered by this provider.")
        service_id = service.id

    memorial_id: uuid.UUID | None = None
    if payload.memorial_id:
        memorial_id = uuid.UUID(payload.memorial_id)

    lead = FarewellLead(
        provider_id=provider.id,
        service_id=service_id,
        family_user_id=requester.id if requester else None,
        memorial_id=memorial_id,
        contact_name=payload.contact_name,
        contact_phone=payload.contact_phone,
        contact_email=payload.contact_email,
        city=payload.city,
        service_needed=payload.service_needed,
        message=payload.message,
        date_needed=payload.date_needed,
        urgency=payload.urgency,
        status=LeadStatus.SUBMITTED.value,
    )
    db.add(lead)
    audit_record(
        db,
        action=AuditAction.LEAD_SUBMITTED,
        entity="farewell_leads",
        entity_id=lead.id,
        actor=requester,
        actor_label=payload.contact_name if requester is None else None,
        detail={
            "providerId": str(provider.id),
            "serviceId": str(service_id) if service_id else None,
        },
        request=request,
    )
    notify(
        db,
        user_id=provider.owner_user_id,
        notification_type=NotificationType.PROVIDER_LEAD_RECEIVED,
        title="New family enquiry",
        body=f"{payload.contact_name} asked about {payload.service_needed}.",
        payload={"leadId": str(lead.id), "providerId": str(provider.id)},
    )
    db.flush()
    return lead


def list_partner_leads(
    db: Session, provider: Provider, *, status_filter: str | None = None
) -> tuple[list[FarewellLead], int]:
    stmt = select(FarewellLead).where(FarewellLead.provider_id == provider.id)
    if status_filter:
        stmt = stmt.where(FarewellLead.status == status_filter)
    items = list(db.scalars(stmt.order_by(FarewellLead.created_at.desc())))
    total = db.scalar(
        select(func.count())
        .select_from(FarewellLead)
        .where(FarewellLead.provider_id == provider.id)
    )
    return items, int(total or 0)


def update_lead_status(
    db: Session,
    *,
    lead: FarewellLead,
    new_status: LeadStatus,
    quoted_amount: str | None,
    actor: User,
    request: Request | None = None,
) -> FarewellLead:
    current = LeadStatus(lead.status)
    if new_status != current and new_status not in LEAD_TRANSITIONS[current]:
        raise ConflictError(f"A lead cannot move from {current.value} to {new_status.value}.")

    lead.status = new_status.value
    if quoted_amount is not None:
        lead.quoted_amount = quoted_amount

    audit_record(
        db,
        action=AuditAction.LEAD_STATUS_CHANGED,
        entity="farewell_leads",
        entity_id=lead.id,
        actor=actor,
        detail={"from": current.value, "to": new_status.value},
        request=request,
    )

    if lead.family_user_id is not None:
        notify(
            db,
            user_id=lead.family_user_id,
            notification_type=NotificationType.LEAD_STATUS_UPDATED,
            title="Update on your service enquiry",
            body=f"Your enquiry is now: {_PARTNER_LABELS[new_status]}.",
            payload={"leadId": str(lead.id), "status": new_status.value},
        )
    db.flush()
    return lead


# ─── Projections ────────────────────────────────────────────────────────────


def _media_url(item: MediaItem) -> str:
    storage = get_storage()
    tier = StorageTier(item.storage_tier)
    return storage.public_url(key=item.storage_key) or storage.presigned_get_url(
        tier=tier, key=item.storage_key
    )


def ready_media(
    db: Session, provider: Provider, *, kind: MediaKind | None = None
) -> list[MediaItem]:
    stmt = select(MediaItem).where(
        MediaItem.provider_id == provider.id,
        MediaItem.status == MediaStatus.READY.value,
        MediaItem.deleted_at.is_(None),
    )
    if kind is not None:
        stmt = stmt.where(MediaItem.kind == kind.value)
    return list(db.scalars(stmt.order_by(MediaItem.created_at)))


def to_provider_media(item: MediaItem) -> ProviderMediaOut:
    return ProviderMediaOut(
        id=str(item.id),
        url=_media_url(item),
        title=item.title,
        status=item.status,
        created_at=item.created_at,
    )


def to_service_out(service: ProviderService) -> ProviderServiceOut:
    return ProviderServiceOut(
        id=str(service.id),
        name=service.name,
        description=service.description,
        price_note=service.price_note,
        estimated_time=service.estimated_time,
        includes=service.include_list,
        active=service.active,
        sort=service.sort,
    )


def to_partner_profile(db: Session, provider: Provider) -> ProviderProfileOut:
    photos = [m for m in ready_media(db, provider) if m.kind == MediaKind.PHOTO.value]
    logo_url = None
    if provider.logo_media_id:
        for item in photos:
            if item.id == provider.logo_media_id:
                logo_url = _media_url(item)
                break
    return ProviderProfileOut(
        id=str(provider.id),
        slug=provider.slug,
        business_name=provider.business_name,
        contact_name=provider.contact_name,
        tagline=provider.tagline,
        category=provider.category,
        city=provider.city,
        service_areas=provider.service_area_list,
        description=provider.description,
        phone=provider.phone,
        whatsapp=provider.whatsapp,
        email=provider.email,
        address=provider.address,
        operating_hours=provider.operating_hours,
        status=provider.status,
        verification_state=provider.verification_state,
        status_reason=provider.status_reason,
        logo_url=logo_url,
        photos=[to_provider_media(item) for item in photos],
        services=[to_service_out(service) for service in list_services(db, provider)],
        created_at=provider.created_at,
        updated_at=provider.updated_at,
    )


def to_verification_out(db: Session, provider: Provider) -> ProviderVerificationOut:
    record = get_verification(db, provider)
    documents = [
        to_provider_media(item) for item in ready_media(db, provider, kind=MediaKind.DOCUMENT)
    ]
    return ProviderVerificationOut(
        state=record.state if record else VerificationState.DRAFT.value,
        submitted_at=record.submitted_at if record else None,
        reviewed_at=record.reviewed_at if record else None,
        decision_reason=record.decision_reason if record else None,
        documents=documents,
    )


def to_partner_lead(db: Session, lead: FarewellLead) -> PartnerLeadOut:
    provider = db.get(Provider, lead.provider_id)
    return PartnerLeadOut(
        id=str(lead.id),
        provider_id=str(lead.provider_id),
        provider_name=provider.business_name if provider else "",
        service_category=lead.service_needed,
        requester_name=lead.contact_name,
        phone=lead.contact_phone,
        email=lead.contact_email,
        city=lead.city,
        date_needed=lead.date_needed,
        urgency=lead.urgency,
        description=lead.message,
        status=_PARTNER_LABELS[LeadStatus(lead.status)],
        quoted_amount=lead.quoted_amount,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


def to_public_provider(db: Session, provider: Provider) -> PublicProviderOut:
    photos = [m for m in ready_media(db, provider) if m.kind == MediaKind.PHOTO.value]
    photo_urls = [_media_url(item) for item in photos]
    logo_url = None
    if provider.logo_media_id:
        for item in photos:
            if item.id == provider.logo_media_id:
                logo_url = _media_url(item)
                break

    services = [s for s in list_services(db, provider) if s.active]
    starting_price = services[0].price_note if services else ""
    badges = (
        ["Documents Reviewed"]
        if provider.verification_state == VerificationState.APPROVED.value
        else []
    )
    return PublicProviderOut(
        id=str(provider.id),
        slug=provider.slug,
        name=provider.contact_name,
        business_name=provider.business_name,
        tagline=provider.tagline,
        category=provider.category,
        city=provider.city,
        service_areas=provider.service_area_list,
        phone=provider.phone,
        whatsapp=provider.whatsapp,
        verified_badges=badges,
        description=provider.description,
        photo_url=logo_url or (photo_urls[0] if photo_urls else ""),
        logo_url=logo_url,
        starting_price=starting_price,
        operating_hours=provider.operating_hours,
        photos=photo_urls,
        services=[
            PublicProviderServiceOut(
                id=str(service.id),
                name=service.name,
                starting_price=service.price_note,
                description=service.description,
                estimated_time=service.estimated_time,
                included=service.include_list,
            )
            for service in services
        ],
        address=provider.address,
    )


def public_provider_summaries(db: Session, provider: Provider) -> PublicProviderOut:
    """Directory rows omit the heavy relations to keep the list cheap."""
    photos = [m for m in ready_media(db, provider) if m.kind == MediaKind.PHOTO.value]
    photo_urls = [_media_url(item) for item in photos]
    services = [s for s in list_services(db, provider) if s.active]
    return PublicProviderOut(
        id=str(provider.id),
        slug=provider.slug,
        name=provider.contact_name,
        business_name=provider.business_name,
        tagline=provider.tagline,
        category=provider.category,
        city=provider.city,
        service_areas=provider.service_area_list,
        phone=provider.phone,
        whatsapp=provider.whatsapp,
        verified_badges=(
            ["Documents Reviewed"]
            if provider.verification_state == VerificationState.APPROVED.value
            else []
        ),
        description=provider.description,
        photo_url=photo_urls[0] if photo_urls else "",
        starting_price=services[0].price_note if services else "",
        operating_hours=provider.operating_hours,
        photos=photo_urls,
        address=provider.address,
    )


def search_public_providers(
    db: Session,
    *,
    query: str | None,
    city: str | None,
    category: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Provider], int]:
    stmt = select(Provider).where(
        Provider.status == ProviderStatus.APPROVED.value,
        Provider.deleted_at.is_(None),
    )
    if query:
        like = f"%{query.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Provider.business_name).like(like),
                func.lower(Provider.tagline).like(like),
                func.lower(Provider.description).like(like),
                func.lower(Provider.category).like(like),
            )
        )
    if city:
        stmt = stmt.where(func.lower(Provider.city) == city.lower())
    if category:
        stmt = stmt.where(func.lower(Provider.category) == category.lower())

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = int(db.scalar(total_stmt) or 0)
    rows = list(db.scalars(stmt.order_by(Provider.business_name).limit(limit).offset(offset)))
    return rows, total


def lead_create_out(lead: FarewellLead) -> LeadCreateOut:
    return LeadCreateOut(
        id=str(lead.id),
        provider_id=str(lead.provider_id),
        status=_FAMILY_LABELS[LeadStatus(lead.status)],
        created_at=lead.created_at,
    )


__all__ = [
    "MAX_GALLERY_PHOTOS",
    "MAX_VERIFICATION_DOCUMENTS",
    "build_slug",
    "create_lead",
    "create_service",
    "decide_verification",
    "delete_service",
    "get_by_id",
    "get_for_owner",
    "get_or_create_for_owner",
    "get_owned_service",
    "get_public_by_slug",
    "get_verification",
    "lead_create_out",
    "list_admin_leads",
    "list_admin_providers",
    "list_partner_leads",
    "list_services",
    "parse_lead_status",
    "public_provider_summaries",
    "ready_media",
    "require_owner_provider",
    "search_public_providers",
    "submit_verification",
    "suspend_provider",
    "to_admin_lead",
    "to_admin_provider",
    "to_partner_lead",
    "to_partner_profile",
    "to_provider_media",
    "to_public_provider",
    "to_service_out",
    "to_verification_out",
    "unique_slug",
    "update_lead_status",
    "update_profile",
    "update_service",
]
