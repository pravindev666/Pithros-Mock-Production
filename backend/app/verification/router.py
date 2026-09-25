"""Verification endpoints.

Two audiences with different authorization:

* the memorial's own members submit and appeal, gated by SUBMIT_VERIFICATION
* reviewers act through `/admin/...`, gated by the VERIFICATION_REVIEWER role

Reviewer routes live under the admin prefix deliberately — verification is an
administrative act, and keeping it out of the member surface means a memorial
member cannot reach it at all.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import CurrentUser, require_admin_role
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import AdminSubRole, MemorialPermission, VerificationDecision
from app.core.rate_limit import user_rate_limit
from app.memorials.models import Memorial
from app.memorials.permissions import authorized, resolve_access
from app.users.models import User
from app.verification import service
from app.verification.models import VerificationEvidence
from app.verification.schemas import (
    VerificationAppealRequest,
    VerificationDecisionRequest,
    VerificationEvidenceAccessOut,
    VerificationOut,
    VerificationQueueItemOut,
    VerificationSubmitRequest,
)

router = APIRouter(prefix="/memorials/{memorial_id}/verification", tags=["Verification"])
evidence_router = APIRouter(prefix="/verification", tags=["Verification"])
admin_router = APIRouter(prefix="/admin/verification", tags=["Admin"])

DbSession = Annotated[Session, Depends(get_db)]
# Resolves the reviewer and enforces the subrole in one dependency, so a route
# cannot reach its body without both.
ReviewerUser = Annotated[User, Depends(require_admin_role(AdminSubRole.VERIFICATION_REVIEWER))]

SubmitLimit = Annotated[
    None, Depends(user_rate_limit("verification_submit", limit=20, window_seconds=3600))
]


def _out(db: Session, memorial: Memorial, submission) -> VerificationOut:
    return service.to_out(db, submission)


@router.get("", response_model=VerificationOut | None)
def get_verification(
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.VIEW))],
    db: DbSession,
) -> VerificationOut | None:
    """Current submission for this memorial, or null if none has been started."""
    submission = service.get_open_submission(db, memorial.id)
    if submission is None:
        return None
    return service.to_out(db, submission)


@router.post("", response_model=VerificationOut, status_code=status.HTTP_201_CREATED)
def submit_verification(
    payload: VerificationSubmitRequest,
    request: Request,
    memorial: Annotated[Memorial, Depends(authorized(MemorialPermission.SUBMIT_VERIFICATION))],
    user: CurrentUser,
    db: DbSession,
    _: SubmitLimit,
) -> VerificationOut:
    """Submit documents for verification.

    Evidence must already have been uploaded through the media pipeline as a
    `document`, which places it in the sensitive storage tier. Anything else is
    refused, so a certificate can never sit in a publicly servable bucket.
    """
    access = resolve_access(db, memorial, user)
    submission = service.submit(
        db,
        memorial=memorial,
        access=access,
        evidence=payload.evidence,
        note=payload.note,
        request=request,
    )
    return service.to_out(db, submission)


@evidence_router.post("/{submission_id}/appeal", response_model=VerificationOut)
def appeal_verification(
    submission_id: uuid.UUID,
    payload: VerificationAppealRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> VerificationOut:
    submission = service.get_by_id(db, submission_id)

    # A submission is reached by id, not through a memorial path parameter, so the
    # memorial has to be loaded and authorized explicitly.
    memorial = db.get(Memorial, submission.memorial_id)
    if memorial is None:
        from app.core.errors import NotFoundError

        raise NotFoundError("Memorial not found")

    access = resolve_access(db, memorial, user)
    if not access.has(MemorialPermission.SUBMIT_VERIFICATION):
        from app.core.errors import ForbiddenError

        raise ForbiddenError("You do not have permission to appeal this verification.")

    updated = service.appeal(
        db, submission=submission, access=access, reason=payload.reason, request=request
    )
    return service.to_out(db, updated)


@evidence_router.get("/evidence/{evidence_id}", response_model=VerificationEvidenceAccessOut)
def get_evidence_url(
    evidence_id: uuid.UUID,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> VerificationEvidenceAccessOut:
    """A short-lived signed URL for one verification document.

    Both authorization *and* an audit record are required: this is how access to
    a death certificate becomes answerable for. The URL expires and the storage
    key is never disclosed.
    """
    from app.core.errors import ForbiddenError, NotFoundError

    evidence = db.get(VerificationEvidence, evidence_id)
    if evidence is None:
        raise NotFoundError("Document not found")

    submission = service.get_by_id(db, evidence.submission_id)
    memorial = db.get(Memorial, submission.memorial_id)
    if memorial is None:
        raise NotFoundError("Memorial not found")

    access = resolve_access(db, memorial, user)
    is_reviewer = (
        user.role == "admin"
        and user.admin_subrole in {AdminSubRole.VERIFICATION_REVIEWER.value, AdminSubRole.SUPER_ADMIN.value}
    )
    if not access.has(MemorialPermission.SUBMIT_VERIFICATION) and not is_reviewer:
        raise ForbiddenError("You do not have permission to view this document.")

    url = service.evidence_url(db, evidence=evidence, actor=user, request=request)
    return VerificationEvidenceAccessOut(
        evidence_id=str(evidence.id),
        url=url,
        expires_in=settings.r2_presign_expiry_seconds,
        document_type=evidence.document_type,
    )


# ─── Reviewer surface ───────────────────────────────────────────────────────


@admin_router.get("", response_model=list[VerificationQueueItemOut])
def verification_queue(
    reviewer: ReviewerUser,
    db: DbSession,
    state: Annotated[list[str] | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[VerificationQueueItemOut]:
    from app.core.enums import VerificationState

    _ = reviewer
    states = [VerificationState(value) for value in state] if state else None
    return service.queue(db, states=states, limit=limit, offset=offset)


@admin_router.post("/{submission_id}/approve", response_model=VerificationOut)
def approve_verification(
    submission_id: uuid.UUID,
    payload: VerificationDecisionRequest,
    request: Request,
    reviewer: ReviewerUser,
    db: DbSession,
) -> VerificationOut:
    submission = service.get_by_id(db, submission_id)
    updated = service.decide(
        db,
        submission=submission,
        reviewer=reviewer,
        decision=VerificationDecision.APPROVED,
        reason=payload.reason,
        request=request,
    )
    return service.to_out(db, updated)


@admin_router.post("/{submission_id}/reject", response_model=VerificationOut)
def reject_verification(
    submission_id: uuid.UUID,
    payload: VerificationDecisionRequest,
    request: Request,
    reviewer: ReviewerUser,
    db: DbSession,
) -> VerificationOut:
    submission = service.get_by_id(db, submission_id)
    updated = service.decide(
        db,
        submission=submission,
        reviewer=reviewer,
        decision=VerificationDecision.REJECTED,
        reason=payload.reason,
        request=request,
    )
    return service.to_out(db, updated)


@admin_router.post("/{submission_id}/request-info", response_model=VerificationOut)
def request_more_information(
    submission_id: uuid.UUID,
    payload: VerificationDecisionRequest,
    request: Request,
    reviewer: ReviewerUser,
    db: DbSession,
) -> VerificationOut:
    submission = service.get_by_id(db, submission_id)
    updated = service.decide(
        db,
        submission=submission,
        reviewer=reviewer,
        decision=VerificationDecision.NEEDS_MORE_INFORMATION,
        reason=payload.reason,
        request=request,
    )
    return service.to_out(db, updated)
