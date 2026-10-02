"""Farewell Network HTTP surface: partner console, public directory, admin desk."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import OptionalUser, require_admin_role, require_role
from app.core.database import get_db
from app.core.enums import AdminSubRole, MediaKind, UserRole, VerificationState
from app.core.errors import NotFoundError
from app.core.rate_limit import rate_limit
from app.providers import media as provider_media
from app.providers import service
from app.providers.models import FarewellLead
from app.providers.schemas import (
    AdminLeadListOut,
    AdminProviderListOut,
    AdminProviderOut,
    LeadCreateIn,
    LeadCreateOut,
    LeadListOut,
    LeadStatusUpdate,
    PartnerLeadOut,
    ProviderDecisionIn,
    ProviderMediaIntentIn,
    ProviderMediaOut,
    ProviderProfileOut,
    ProviderProfileUpdate,
    ProviderServiceIn,
    ProviderServiceOut,
    ProviderServiceUpdate,
    ProviderSubmitOut,
    ProviderVerificationOut,
    PublicProviderListOut,
    PublicProviderOut,
)
from app.users.models import User

DbSession = Annotated[Session, Depends(get_db)]
PartnerUser = Annotated[User, Depends(require_role(UserRole.PARTNER))]
ProviderManager = Annotated[User, Depends(require_admin_role(AdminSubRole.PROVIDER_MANAGER))]

partner_router = APIRouter(prefix="/partner", tags=["Providers"])
public_router = APIRouter(prefix="/public/providers", tags=["Providers", "Leads"])
admin_router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Partner console ────────────────────────────────────────────────────────


@partner_router.get("/profile", response_model=ProviderProfileOut)
def get_profile(user: PartnerUser, db: DbSession) -> ProviderProfileOut:
    provider = service.get_or_create_for_owner(db, user)
    db.commit()
    return service.to_partner_profile(db, provider)


@partner_router.patch("/profile", response_model=ProviderProfileOut)
def update_profile(
    payload: ProviderProfileUpdate, user: PartnerUser, db: DbSession
) -> ProviderProfileOut:
    provider = service.require_owner_provider(db, user)
    service.update_profile(
        db,
        provider=provider,
        updates=payload.model_dump(exclude_unset=True),
        actor=user,
    )
    db.commit()
    return service.to_partner_profile(db, provider)


@partner_router.get("/verification", response_model=ProviderVerificationOut)
def get_verification(user: PartnerUser, db: DbSession) -> ProviderVerificationOut:
    provider = service.require_owner_provider(db, user)
    return service.to_verification_out(db, provider)


@partner_router.post("/verification/submit", response_model=ProviderSubmitOut)
def submit_verification(user: PartnerUser, db: DbSession) -> ProviderSubmitOut:
    provider = service.require_owner_provider(db, user)
    record = service.submit_verification(db, provider=provider, actor=user)
    db.commit()
    return ProviderSubmitOut(
        state=record.state,
        message="Your credentials are with the review team.",
    )


@partner_router.get("/services", response_model=list[ProviderServiceOut])
def list_services(user: PartnerUser, db: DbSession) -> list[ProviderServiceOut]:
    provider = service.require_owner_provider(db, user)
    return [service.to_service_out(item) for item in service.list_services(db, provider)]


@partner_router.post("/services", response_model=ProviderServiceOut, status_code=201)
def create_service(
    payload: ProviderServiceIn, user: PartnerUser, db: DbSession
) -> ProviderServiceOut:
    provider = service.require_owner_provider(db, user)
    created = service.create_service(
        db,
        provider=provider,
        payload=payload.model_dump(),
        actor=user,
    )
    db.commit()
    return service.to_service_out(created)


@partner_router.patch("/services/{service_id}", response_model=ProviderServiceOut)
def update_service(
    service_id: uuid.UUID,
    payload: ProviderServiceUpdate,
    user: PartnerUser,
    db: DbSession,
) -> ProviderServiceOut:
    provider = service.require_owner_provider(db, user)
    target = service.get_owned_service(db, provider, service_id)
    updated = service.update_service(
        db,
        provider=provider,
        service=target,
        updates=payload.model_dump(exclude_unset=True),
        actor=user,
    )
    db.commit()
    return service.to_service_out(updated)


@partner_router.delete("/services/{service_id}", status_code=204)
def delete_service(service_id: uuid.UUID, user: PartnerUser, db: DbSession) -> None:
    provider = service.require_owner_provider(db, user)
    target = service.get_owned_service(db, provider, service_id)
    service.delete_service(db, provider=provider, service=target, actor=user)
    db.commit()


@partner_router.get("/media", response_model=list[ProviderMediaOut])
def list_media(
    user: PartnerUser,
    db: DbSession,
    kind: Annotated[str | None, Query(pattern="^(photo|document)$")] = None,
) -> list[ProviderMediaOut]:
    provider = service.require_owner_provider(db, user)
    items = provider_media.list_media(db, provider, kind=MediaKind(kind) if kind else None)
    return [service.to_provider_media(item) for item in items]


@partner_router.post("/media/intent")
def create_media_intent(
    payload: ProviderMediaIntentIn, user: PartnerUser, db: DbSession
) -> dict[str, object]:
    provider = service.require_owner_provider(db, user)
    item, upload_url = provider_media.create_intent(
        db, provider=provider, payload=payload, actor=user
    )
    db.commit()
    return {
        "mediaId": str(item.id),
        "uploadUrl": upload_url,
        "method": "PUT",
    }


@partner_router.post("/media/{media_id}/complete", response_model=ProviderMediaOut)
def complete_media_upload(
    media_id: uuid.UUID, user: PartnerUser, db: DbSession
) -> ProviderMediaOut:
    provider = service.require_owner_provider(db, user)
    item = provider_media.complete_upload(
        db,
        provider=provider,
        media_id=media_id,
        actor=user,
    )
    db.commit()
    return service.to_provider_media(item)


@partner_router.delete("/media/{media_id}", status_code=204)
def delete_media(media_id: uuid.UUID, user: PartnerUser, db: DbSession) -> None:
    provider = service.require_owner_provider(db, user)
    provider_media.delete_media(
        db,
        provider=provider,
        media_id=media_id,
        actor=user,
    )
    db.commit()


@partner_router.get("/leads", response_model=LeadListOut)
def list_leads(
    user: PartnerUser,
    db: DbSession,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> LeadListOut:
    provider = service.require_owner_provider(db, user)
    canonical = service.parse_lead_status(status_filter).value if status_filter else None
    items, total = service.list_partner_leads(db, provider, status_filter=canonical)
    return LeadListOut(
        leads=[service.to_partner_lead(db, lead) for lead in items],
        total=total,
    )


@partner_router.patch("/leads/{lead_id}", response_model=PartnerLeadOut)
def update_lead(
    lead_id: uuid.UUID,
    payload: LeadStatusUpdate,
    user: PartnerUser,
    db: DbSession,
) -> PartnerLeadOut:
    provider = service.require_owner_provider(db, user)
    lead = db.get(FarewellLead, lead_id)
    if lead is None or lead.provider_id != provider.id:
        raise NotFoundError("Lead not found")
    updated = service.update_lead_status(
        db,
        lead=lead,
        new_status=service.parse_lead_status(payload.status),
        quoted_amount=payload.quoted_amount,
        actor=user,
    )
    db.commit()
    return service.to_partner_lead(db, updated)


# ─── Public directory ───────────────────────────────────────────────────────


@public_router.get("", response_model=PublicProviderListOut)
def list_public_providers(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=120)] = None,
    city: Annotated[str | None, Query(max_length=120)] = None,
    category: Annotated[str | None, Query(max_length=80)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PublicProviderListOut:
    providers, total = service.search_public_providers(
        db, query=q, city=city, category=category, limit=limit, offset=offset
    )
    return PublicProviderListOut(
        providers=[service.public_provider_summaries(db, item) for item in providers],
        total=total,
    )


@public_router.get("/{slug}", response_model=PublicProviderOut)
def get_public_provider(slug: str, db: DbSession) -> PublicProviderOut:
    provider = service.get_public_by_slug(db, slug)
    return service.to_public_provider(db, provider)


@public_router.post(
    "/{slug}/leads",
    response_model=LeadCreateOut,
    status_code=201,
    dependencies=[Depends(rate_limit("public_provider_lead", 10, 3600))],
)
def create_public_lead(
    slug: str,
    payload: LeadCreateIn,
    db: DbSession,
    requester: OptionalUser,
) -> LeadCreateOut:
    provider = service.get_public_by_slug(db, slug)
    lead = service.create_lead(db, provider=provider, payload=payload, requester=requester)
    db.commit()
    return service.lead_create_out(lead)


# ─── Admin desk ─────────────────────────────────────────────────────────────


@admin_router.get("/providers", response_model=AdminProviderListOut)
def list_admin_providers(
    user: ProviderManager,
    db: DbSession,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AdminProviderListOut:
    providers, total = service.list_admin_providers(
        db, status_filter=status_filter, query=q, limit=limit, offset=offset
    )
    return AdminProviderListOut(
        providers=[service.to_admin_provider(db, item) for item in providers],
        total=total,
    )


@admin_router.get("/providers/{provider_id}", response_model=AdminProviderOut)
def get_admin_provider(
    provider_id: uuid.UUID, user: ProviderManager, db: DbSession
) -> AdminProviderOut:
    provider = service.get_by_id(db, provider_id)
    return service.to_admin_provider(db, provider)


@admin_router.post("/providers/{provider_id}/approve", response_model=AdminProviderOut)
def approve_provider(
    provider_id: uuid.UUID,
    payload: ProviderDecisionIn,
    user: ProviderManager,
    db: DbSession,
) -> AdminProviderOut:
    provider = service.get_by_id(db, provider_id)
    service.decide_verification(
        db,
        provider=provider,
        admin=user,
        decision=VerificationState.APPROVED,
        reason=payload.reason,
    )
    db.commit()
    return service.to_admin_provider(db, provider)


@admin_router.post("/providers/{provider_id}/reject", response_model=AdminProviderOut)
def reject_provider(
    provider_id: uuid.UUID,
    payload: ProviderDecisionIn,
    user: ProviderManager,
    db: DbSession,
) -> AdminProviderOut:
    provider = service.get_by_id(db, provider_id)
    service.decide_verification(
        db,
        provider=provider,
        admin=user,
        decision=VerificationState.REJECTED,
        reason=payload.reason,
    )
    db.commit()
    return service.to_admin_provider(db, provider)


@admin_router.post("/providers/{provider_id}/request-info", response_model=AdminProviderOut)
def request_provider_info(
    provider_id: uuid.UUID,
    payload: ProviderDecisionIn,
    user: ProviderManager,
    db: DbSession,
) -> AdminProviderOut:
    provider = service.get_by_id(db, provider_id)
    service.decide_verification(
        db,
        provider=provider,
        admin=user,
        decision=VerificationState.NEEDS_MORE_INFORMATION,
        reason=payload.reason,
    )
    db.commit()
    return service.to_admin_provider(db, provider)


@admin_router.post("/providers/{provider_id}/suspend", response_model=AdminProviderOut)
def suspend_provider(
    provider_id: uuid.UUID,
    payload: ProviderDecisionIn,
    user: ProviderManager,
    db: DbSession,
) -> AdminProviderOut:
    provider = service.get_by_id(db, provider_id)
    service.suspend_provider(
        db,
        provider=provider,
        admin=user,
        reason=payload.reason,
    )
    db.commit()
    return service.to_admin_provider(db, provider)


@admin_router.get("/leads", response_model=AdminLeadListOut)
def list_admin_leads(
    user: ProviderManager,
    db: DbSession,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AdminLeadListOut:
    canonical = service.parse_lead_status(status_filter).value if status_filter else None
    leads, total = service.list_admin_leads(db, status_filter=canonical, limit=limit, offset=offset)
    return AdminLeadListOut(
        leads=[service.to_admin_lead(db, lead) for lead in leads],
        total=total,
    )
