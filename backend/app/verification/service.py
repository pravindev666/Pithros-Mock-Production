"""Verification lifecycle.

The state machine is enforced here, not in the UI. A submission reaches APPROVED
only by moving through review — an illegal jump is a 409, so no code path can
shortcut the process.

Nothing in this module presents automated output as legal certification. The
detection work (OCR, field extraction, consistency checks) is deferred; what is
real is the workflow, the evidence storage, the audit trail, and the human
decision.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from starlette.requests import Request

from app.audit.service import record as audit_record
from app.core.database import transaction
from app.core.enums import (
    VERIFICATION_TRANSITIONS,
    AuditAction,
    MediaKind,
    MediaStatus,
    NotificationType,
    StorageTier,
    VerificationDecision,
    VerificationState,
)
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.media.models import MediaItem
from app.media.storage import get_storage
from app.memorials.cache import invalidate_public_memorial_cache
from app.memorials.models import Memorial
from app.memorials.permissions import MemorialAccess
from app.notifications.service import notify, notify_reviewers
from app.users.models import User
from app.verification.models import (
    VerificationDecisionRecord,
    VerificationEvidence,
    VerificationSubmission,
)
from app.verification.schemas import (
    EvidenceAttachRequest,
    VerificationDecisionOut,
    VerificationEvidenceOut,
    VerificationOut,
    VerificationQueueItemOut,
)

TERMINAL_STATES = {VerificationState.APPROVED.value}


def ensure_transition(current: VerificationState, target: VerificationState) -> None:
    """Refuse an illegal state change.

    The single place transition legality is decided, so no route can bypass it.
    """
    if target not in VERIFICATION_TRANSITIONS[current]:
        allowed = sorted(state.value for state in VERIFICATION_TRANSITIONS[current])
        raise ConflictError(
            f"A verification in '{current.value}' cannot move to '{target.value}'.",
            details={"allowedNextStates": allowed},
        )


def _effective_state(submission: VerificationSubmission, target: VerificationState) -> None:
    ensure_transition(VerificationState(submission.state), target)
    submission.state = target.value


def _sync_memorial(memorial: Memorial, state: VerificationState) -> None:
    """Mirror the submission state onto the memorial.

    The memorial carries `verification_state` and the UI reads it from there, so
    the two must not be allowed to disagree.
    """
    memorial.verification_state = state.value
    if state == VerificationState.APPROVED:
        memorial.verification_badge_type = "Document Reviewed"


def get_open_submission(db: Session, memorial_id: uuid.UUID) -> VerificationSubmission | None:
    """The most recent submission that is still in play."""
    stmt = (
        select(VerificationSubmission)
        .where(
            VerificationSubmission.memorial_id == memorial_id,
            VerificationSubmission.state.notin_(
                [*TERMINAL_STATES, VerificationState.REJECTED.value]
            ),
        )
        .options(
            selectinload(VerificationSubmission.evidence),
            selectinload(VerificationSubmission.decisions),
        )
        .order_by(VerificationSubmission.created_at.desc())
        .limit(1)
    )
    return db.scalar(stmt)


def get_by_id(db: Session, submission_id: uuid.UUID) -> VerificationSubmission:
    submission = db.scalar(
        select(VerificationSubmission)
        .where(VerificationSubmission.id == submission_id)
        .options(
            selectinload(VerificationSubmission.evidence),
            selectinload(VerificationSubmission.decisions),
        )
    )
    if submission is None:
        raise NotFoundError("Verification submission not found")
    return submission


def _load_evidence_media(db: Session, memorial_id: uuid.UUID, media_id: uuid.UUID) -> MediaItem:
    media = db.scalar(
        select(MediaItem).where(
            MediaItem.id == media_id,
            MediaItem.memorial_id == memorial_id,
            MediaItem.deleted_at.is_(None),
        )
    )
    if media is None:
        raise NotFoundError("Document not found")

    if media.status != MediaStatus.READY.value:
        raise ConflictError("That document has not finished uploading.")

    # Evidence must live in the sensitive tier. Refusing anything else keeps
    # certificates out of any bucket that could ever be served publicly.
    if media.storage_tier != StorageTier.SENSITIVE.value:
        raise ValidationError("Only documents uploaded as verification evidence can be attached.")

    if media.kind != MediaKind.DOCUMENT.value:
        raise ValidationError("Verification evidence must be a document.")

    return media


def _record_decision(
    db: Session,
    *,
    submission: VerificationSubmission,
    previous: VerificationState,
    new: VerificationState,
    decision: VerificationDecision,
    reviewer: User | None,
    reviewer_label: str,
    reason: str | None,
) -> VerificationDecisionRecord:
    record = VerificationDecisionRecord(
        submission_id=submission.id,
        decision=decision.value,
        previous_state=previous.value,
        new_state=new.value,
        reviewer_id=reviewer.id if reviewer else None,
        reviewer_label=reviewer_label,
        reason=reason,
    )
    db.add(record)
    db.flush()
    return record


def submit(
    db: Session,
    *,
    memorial: Memorial,
    access: MemorialAccess,
    evidence: list[EvidenceAttachRequest],
    note: str | None,
    request: Request | None = None,
) -> VerificationSubmission:
    """Submit a memorial for verification.

    Moves DRAFT (or NEEDS_MORE_INFORMATION) to SUBMITTED, attaches evidence, and
    queues the preparation step.
    """
    if not evidence:
        raise ValidationError("At least one document is required.")

    submission = get_open_submission(db, memorial.id)
    if submission is None:
        submission = VerificationSubmission(
            memorial_id=memorial.id,
            state=VerificationState.DRAFT.value,
        )
        db.add(submission)
        db.flush()

    previous = VerificationState(submission.state)
    ensure_transition(previous, VerificationState.SUBMITTED)

    with transaction(db):
        _effective_state(submission, VerificationState.SUBMITTED)
        submission.submitted_by_id = access.user.id if access.user else None
        submission.submitted_at = datetime.now(UTC)
        submission.decision_reason = note

        for item in evidence:
            media = _load_evidence_media(db, memorial.id, item.media_id)
            db.add(
                VerificationEvidence(
                    submission_id=submission.id,
                    media_id=media.id,
                    document_type=item.document_type.value,
                    label=item.label,
                    uploaded_by_id=access.user.id if access.user else None,
                )
            )

        db.flush()
        _record_decision(
            db,
            submission=submission,
            previous=previous,
            new=VerificationState.SUBMITTED,
            decision=VerificationDecision.SUBMITTED,
            reviewer=access.user,
            reviewer_label="submitter",
            reason=note,
        )
        _sync_memorial(memorial, VerificationState.SUBMITTED)

        audit_record(
            db,
            action=AuditAction.VERIFICATION_SUBMITTED,
            entity="verification_submission",
            entity_id=submission.id,
            actor=access.user,
            detail={
                "memorialId": str(memorial.id),
                "documents": len(evidence),
                "previousState": previous.value,
            },
            request=request,
        )

        notify_reviewers(
            db,
            title=f"Verification submitted for {memorial.full_name}",
            body=(
                "A family submitted evidence of passing for review. "
                "Open the verification queue to inspect it."
            ),
            payload={"submissionId": str(submission.id), "memorialId": str(memorial.id)},
        )

    db.refresh(submission)
    invalidate_public_memorial_cache(memorial.slug)

    from app.verification.tasks import queue_verification_preparation

    queue_verification_preparation(submission.id)
    return submission


def _advance(
    db: Session, submission_id: uuid.UUID, target: VerificationState
) -> VerificationSubmission:
    """Move a submission forward and keep the memorial in step.

    Every transition has to sync the memorial — the UI reads
    `memorial.verification_state`, so a submission that moved alone would leave the
    two disagreeing and the badge showing a stale state.
    """
    submission = get_by_id(db, submission_id)
    current = VerificationState(submission.state)
    if target not in VERIFICATION_TRANSITIONS[current]:
        return submission

    _effective_state(submission, target)

    memorial = db.get(Memorial, submission.memorial_id)
    if memorial is not None:
        _sync_memorial(memorial, target)

    db.commit()
    if memorial is not None:
        invalidate_public_memorial_cache(memorial.slug)
    return submission


def mark_processing(db: Session, submission_id: uuid.UUID) -> VerificationSubmission:
    """SUBMITTED -> VERIFICATION_PENDING. Called by the worker when it picks up."""
    return _advance(db, submission_id, VerificationState.VERIFICATION_PENDING)


def mark_ready_for_review(db: Session, submission_id: uuid.UUID) -> VerificationSubmission:
    """VERIFICATION_PENDING -> VERIFICATION_REVIEW.

    Whatever automated preparation runs first belongs here. Today it does none —
    the submission simply becomes reviewable by a human, which is stated plainly
    rather than dressed up as analysis.
    """
    return _advance(db, submission_id, VerificationState.VERIFICATION_REVIEW)


def _notify_decision(
    db: Session,
    *,
    submission: VerificationSubmission,
    memorial: Memorial,
    decision: VerificationDecision,
    reason: str | None,
) -> None:
    """Tell the submitter what happened, in the product's own voice."""
    recipient_id = submission.submitted_by_id
    if recipient_id is None:
        primary = memorial.primary_steward
        recipient_id = primary.user_id if primary else None
    if recipient_id is None:
        return

    if decision == VerificationDecision.APPROVED:
        notification_type = NotificationType.VERIFICATION_APPROVED
        title = "Verification approved"
        body = (
            f"The verification for {memorial.full_name} was approved. "
            'The memorial now carries the "Document Reviewed" badge.'
        )
    elif decision == VerificationDecision.REJECTED:
        notification_type = NotificationType.VERIFICATION_REJECTED
        title = "Verification not approved"
        body = (
            f"The verification for {memorial.full_name} was not approved."
            + (f" Reason: {reason}" if reason else "")
            + " You can appeal from the verification page on your dashboard."
        )
    else:
        notification_type = NotificationType.VERIFICATION_NEEDS_INFO
        title = "More information needed"
        body = (
            f"The reviewer needs more information for {memorial.full_name}."
            + (f" Reason: {reason}" if reason else "")
            + " Upload the additional document from your dashboard verification page."
        )

    notify(
        db,
        user_id=recipient_id,
        notification_type=notification_type,
        title=title,
        body=body,
        payload={
            "submissionId": str(submission.id),
            "memorialSlug": memorial.slug,
            "decision": decision.value,
        },
    )


def decide(
    db: Session,
    *,
    submission: VerificationSubmission,
    reviewer: User,
    decision: VerificationDecision,
    reason: str | None,
    request: Request | None = None,
) -> VerificationSubmission:
    """Record a reviewer's decision. Only legal from VERIFICATION_REVIEW."""
    target = VerificationState(decision.value)
    previous = VerificationState(submission.state)
    ensure_transition(previous, target)

    memorial = db.get(Memorial, submission.memorial_id)
    if memorial is None:
        raise NotFoundError("Memorial not found")

    with transaction(db):
        _effective_state(submission, target)
        submission.reviewed_by_id = reviewer.id
        submission.reviewed_at = datetime.now(UTC)
        submission.decision_reason = reason

        _record_decision(
            db,
            submission=submission,
            previous=previous,
            new=target,
            decision=decision,
            reviewer=reviewer,
            reviewer_label=reviewer.name,
            reason=reason,
        )
        _sync_memorial(memorial, target)

        audit_record(
            db,
            action=(
                AuditAction.VERIFICATION_APPROVED
                if target == VerificationState.APPROVED
                else AuditAction.VERIFICATION_REJECTED
            ),
            entity="verification_submission",
            entity_id=submission.id,
            actor=reviewer,
            detail={
                "memorialId": str(submission.memorial_id),
                "decision": decision.value,
                "reason": reason,
            },
            request=request,
        )

        _notify_decision(
            db,
            submission=submission,
            memorial=memorial,
            decision=decision,
            reason=reason,
        )

    db.refresh(submission)
    invalidate_public_memorial_cache(memorial.slug)
    return submission


def appeal(
    db: Session,
    *,
    submission: VerificationSubmission,
    access: MemorialAccess,
    reason: str,
    request: Request | None = None,
) -> VerificationSubmission:
    """A rejected submitter can ask for another look."""
    previous = VerificationState(submission.state)
    ensure_transition(previous, VerificationState.APPEAL)

    memorial = db.get(Memorial, submission.memorial_id)

    with transaction(db):
        _effective_state(submission, VerificationState.APPEAL)
        _record_decision(
            db,
            submission=submission,
            previous=previous,
            new=VerificationState.APPEAL,
            decision=VerificationDecision.APPEALED,
            reviewer=access.user,
            reviewer_label="submitter",
            reason=reason,
        )
        if memorial is not None:
            _sync_memorial(memorial, VerificationState.APPEAL)

        audit_record(
            db,
            action=AuditAction.VERIFICATION_SUBMITTED,
            entity="verification_submission",
            entity_id=submission.id,
            actor=access.user,
            detail={"memorialId": str(submission.memorial_id), "appeal": True},
            request=request,
        )

        if memorial is not None:
            notify_reviewers(
                db,
                notification_type=NotificationType.VERIFICATION_APPEALED,
                title=f"Verification appeal received for {memorial.full_name}",
                body="A rejected submission was appealed. Please take another look.",
                payload={
                    "submissionId": str(submission.id),
                    "memorialId": str(submission.memorial_id),
                },
            )

    db.refresh(submission)
    if memorial is not None:
        invalidate_public_memorial_cache(memorial.slug)
    return submission


def queue(
    db: Session,
    *,
    states: list[VerificationState] | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[VerificationQueueItemOut]:
    """Reviewer queue. Spans memorials, so it is a separate projection."""
    reviewing = states or [
        VerificationState.VERIFICATION_PENDING,
        VerificationState.VERIFICATION_REVIEW,
        VerificationState.APPEAL,
    ]

    rows = db.execute(
        select(VerificationSubmission, Memorial)
        .join(Memorial, Memorial.id == VerificationSubmission.memorial_id)
        .where(
            VerificationSubmission.state.in_([state.value for state in reviewing]),
            Memorial.deleted_at.is_(None),
        )
        .options(selectinload(VerificationSubmission.evidence))
        .order_by(VerificationSubmission.submitted_at.asc().nulls_last())
        .limit(limit)
        .offset(offset)
    ).all()

    return [
        VerificationQueueItemOut(
            id=str(submission.id),
            memorial_id=str(memorial.id),
            memorial_name=memorial.full_name,
            memorial_slug=memorial.slug,
            state=submission.state,
            submitted_at=submission.submitted_at,
            evidence_count=len(submission.evidence),
            overall_risk=submission.risk_signals.get("overall_risk")
            if submission.risk_signals
            else None,
            document_confidence=submission.risk_signals.get("document_type_confidence")
            if submission.risk_signals
            else None,
        )
        for submission, memorial in rows
    ]


def evidence_url(
    db: Session,
    *,
    evidence: VerificationEvidence,
    actor: User,
    request: Request | None = None,
) -> str:
    """Short-lived signed URL for one document, with an audit record.

    Every read of a verification document is logged — these are death
    certificates and identity proofs, and access should be answerable for.
    """
    media = db.get(MediaItem, evidence.media_id)
    if media is None or media.deleted_at is not None:
        raise NotFoundError("Document not found")

    audit_record(
        db,
        action=AuditAction.SENSITIVE_DOCUMENT_ACCESSED,
        entity="verification_evidence",
        entity_id=evidence.id,
        actor=actor,
        detail={
            "documentType": evidence.document_type,
            "submissionId": str(evidence.submission_id),
        },
        request=request,
    )
    db.commit()

    return get_storage().presigned_get_url(
        tier=StorageTier(media.storage_tier), key=media.storage_key
    )


# ─── Projections ────────────────────────────────────────────────────────────


def to_out(db: Session, submission: VerificationSubmission) -> VerificationOut:
    reviewers: dict[uuid.UUID, str] = {}
    for record in submission.decisions:
        if record.reviewer_id is not None and record.reviewer_id not in reviewers:
            reviewer = db.get(User, record.reviewer_id)
            if reviewer is not None:
                reviewers[record.reviewer_id] = reviewer.name

    current = VerificationState(submission.state)

    return VerificationOut(
        id=str(submission.id),
        memorial_id=str(submission.memorial_id),
        state=submission.state,
        submitted_at=submission.submitted_at,
        reviewed_at=submission.reviewed_at,
        decision_reason=submission.decision_reason,
        automated_result=submission.automated_result,
        risk_signals=submission.risk_signals,
        evidence=[
            VerificationEvidenceOut(
                id=str(item.id),
                media_id=str(item.media_id),
                document_type=item.document_type,
                label=item.label,
                uploaded_at=item.created_at,
            )
            for item in submission.evidence
        ],
        decisions=[
            VerificationDecisionOut(
                id=str(record.id),
                decision=record.decision,
                previous_state=record.previous_state,
                new_state=record.new_state,
                reviewer=reviewers.get(record.reviewer_id or uuid.uuid4(), record.reviewer_label),
                reason=record.reason,
                created_at=record.created_at,
            )
            for record in sorted(submission.decisions, key=lambda r: r.created_at)
        ],
        allowed_next_states=sorted(state.value for state in VERIFICATION_TRANSITIONS[current]),
    )
