"""Verification schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from app.core.enums import VerificationDocumentType, VerificationDecision
from app.core.schemas import CamelModel, StrictModel


class EvidenceAttachRequest(StrictModel):
    media_id: uuid.UUID
    document_type: VerificationDocumentType
    label: str | None = Field(default=None, max_length=200)


class VerificationSubmitRequest(StrictModel):
    evidence: list[EvidenceAttachRequest] = Field(default_factory=list, max_length=20)
    note: str | None = Field(default=None, max_length=2000)


class VerificationDecisionRequest(StrictModel):
    reason: str | None = Field(default=None, max_length=2000)


class VerificationAppealRequest(StrictModel):
    reason: str = Field(min_length=1, max_length=2000)


class VerificationEvidenceOut(CamelModel):
    id: str
    media_id: str
    document_type: str
    label: str | None = None
    uploaded_at: datetime


class VerificationDecisionOut(CamelModel):
    id: str
    decision: str
    previous_state: str
    new_state: str
    reviewer: str
    reason: str | None = None
    created_at: datetime


class VerificationOut(CamelModel):
    id: str
    memorial_id: str
    state: str
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    decision_reason: str | None = None
    evidence: list[VerificationEvidenceOut] = Field(default_factory=list)
    decisions: list[VerificationDecisionOut] = Field(default_factory=list)
    # What the submitter may legally do next, so the UI does not have to guess.
    allowed_next_states: list[str] = Field(default_factory=list)


class VerificationQueueItemOut(CamelModel):
    id: str
    memorial_id: str
    memorial_name: str
    memorial_slug: str
    state: str
    submitted_at: datetime | None = None
    evidence_count: int = 0


class VerificationEvidenceAccessOut(CamelModel):
    """A short-lived signed URL for one document.

    Never a permanent URL and never the storage key — evidence lives in the
    sensitive tier and every read is audited.
    """

    evidence_id: str
    url: str
    expires_in: int
    document_type: str


def decision_from_status(status: str) -> VerificationDecision:
    return VerificationDecision(status)
