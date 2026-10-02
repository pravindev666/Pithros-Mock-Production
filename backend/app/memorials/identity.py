"""Identity resolution, duplicate screening, and collision governance.

Handles:
- Indian and international honorific/title normalization
- Multi-token order-independent name similarity
- Lifespan window and year extraction
- Multi-signal composite similarity scoring (name + lifespan + location)
- Privacy-safe collision screening (redacting private memorial metadata from other users)
- Dispute and merge workflows preserving audit history
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import record as audit_record
from app.core.database import transaction
from app.core.enums import (
    AuditAction,
    ContributorRole,
    ContributorStatus,
    PrivacyLevel,
    PublicationState,
    UserRole,
)
from app.core.errors import NotFoundError, ValidationError
from app.media.models import MediaItem
from app.memorials.models import (
    Memorial,
    MemorialContributor,
)
from app.memorials.schemas import (
    CandidateMatchSummary,
    DuplicateScreeningOut,
    DuplicateScreeningRequest,
)
from app.tributes.models import Tribute
from app.users.models import User

if TYPE_CHECKING:
    from starlette.requests import Request

# ─── Honorifics and Titles to Strip for Comparison ───────────────────────────

HONORIFICS = frozenset(
    [
        "dr",
        "doctor",
        "col",
        "colonel",
        "late",
        "prof",
        "professor",
        "smt",
        "shrimati",
        "shri",
        "sri",
        "mr",
        "mrs",
        "ms",
        "pandit",
        "pt",
        "major",
        "capt",
        "captain",
        "rev",
        "reverend",
        "father",
        "justice",
        "adv",
        "advocate",
        "sir",
        "padma",
        "bhushan",
        "vibhushan",
        "shri",
    ]
)

YEAR_REGEX = re.compile(r"\b(18\d{2}|19\d{2}|20\d{2})\b")


def normalize_name(name: str) -> str:
    """Normalize names by lowercasing, stripping honorifics, removing punctuation,
    and sorting tokens alphabetically.

    Examples:
    - "Dr. Arun Krishnan" -> "arun krishnan"
    - "Krishnan, Arun" -> "arun krishnan"
    - "Late Col. Hardeep Singh Gill" -> "gill hardeep singh"
    - "Smt. Kamala Devi" -> "devi kamala"
    """
    if not name:
        return ""
    # Strip non-alphanumeric except whitespace
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", name.lower())
    tokens = [t for t in cleaned.split() if t not in HONORIFICS and len(t) > 0]
    return " ".join(sorted(tokens))


def extract_years(date_str: str | None) -> list[int]:
    """Extract valid 4-digit years from a freeform date string."""
    if not date_str:
        return []
    matches = YEAR_REGEX.findall(str(date_str))
    return [int(m) for m in matches]


def normalize_location(location: str | None) -> str:
    """Normalize city / place strings."""
    if not location:
        return ""
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", location.lower())
    return " ".join(sorted(cleaned.split()))


@dataclass
class IdentityMatchScore:
    name_similarity: float
    lifespan_score: float
    location_score: float
    composite_score: float
    confidence_tier: (
        str  # "high_confidence" | "possible_match" | "likely_different" | "insufficient_info"
    )


def calculate_identity_similarity(
    name_a: str,
    birth_a: str | None,
    death_a: str | None,
    loc_a: str | None,
    name_b: str,
    birth_b: str | None,
    death_b: str | None,
    loc_b: str | None,
) -> IdentityMatchScore:
    """Multi-signal composite identity comparison:
    1. Token-sorted Name Similarity (0.0 to 1.0)
    2. Lifespan Window Comparison
    3. Location Substring Matching
    """
    norm_a = normalize_name(name_a)
    norm_b = normalize_name(name_b)

    if not norm_a or not norm_b:
        return IdentityMatchScore(0.0, 0.0, 0.0, 0.0, "insufficient_info")

    name_sim = SequenceMatcher(None, norm_a, norm_b).ratio()

    # Extract years
    birth_years_a = extract_years(birth_a)
    death_years_a = extract_years(death_a)
    birth_years_b = extract_years(birth_b)
    death_years_b = extract_years(death_b)

    by_a = birth_years_a[0] if birth_years_a else None
    dy_a = death_years_a[0] if death_years_a else None
    by_b = birth_years_b[0] if birth_years_b else None
    dy_b = death_years_b[0] if death_years_b else None

    lifespan_score = 0.0
    conflicting_lifespan = False

    # Check for direct chronological conflict
    if by_a and by_b and abs(by_a - by_b) > 8:
        conflicting_lifespan = True
    if dy_a and dy_b and abs(dy_a - dy_b) > 8:
        conflicting_lifespan = True

    if conflicting_lifespan:
        # Strong negative signal: different generation or century
        lifespan_score = -0.5
    else:
        # Positive signals
        if by_a and by_b and by_a == by_b:
            lifespan_score += 0.35
        elif by_a and by_b and abs(by_a - by_b) <= 2:
            lifespan_score += 0.15

        if dy_a and dy_b and dy_a == dy_b:
            lifespan_score += 0.35
        elif dy_a and dy_b and abs(dy_a - dy_b) <= 2:
            lifespan_score += 0.15

    # Location scoring
    loc_norm_a = normalize_location(loc_a)
    loc_norm_b = normalize_location(loc_b)
    location_score = 0.0
    if loc_norm_a and loc_norm_b:
        tokens_a = set(loc_norm_a.split())
        tokens_b = set(loc_norm_b.split())
        overlap = tokens_a.intersection(tokens_b)
        if overlap:
            location_score = 0.20

    # Composite score
    composite = name_sim * 0.60 + lifespan_score + location_score
    composite = max(0.0, min(composite, 1.0))

    if conflicting_lifespan:
        tier = "likely_different"
    elif composite >= 0.80 and name_sim >= 0.70:
        tier = "high_confidence"
    elif composite >= 0.55 and name_sim >= 0.60:
        tier = "possible_match"
    elif not by_a and not dy_a and not by_b and not dy_b:
        tier = "insufficient_info" if name_sim >= 0.70 else "likely_different"
    else:
        tier = "likely_different"

    return IdentityMatchScore(
        name_similarity=round(name_sim, 3),
        lifespan_score=round(lifespan_score, 3),
        location_score=round(location_score, 3),
        composite_score=round(composite, 3),
        confidence_tier=tier,
    )


def screen_for_duplicates(
    db: Session,
    *,
    actor: User,
    payload: DuplicateScreeningRequest,
    exclude_memorial_id: uuid.UUID | None = None,
) -> DuplicateScreeningOut:
    """Privacy-safe duplicate screening.

    CRITICAL PRIVACY RULE:
    If a candidate match belongs to ANOTHER user and is PRIVATE or UNLISTED,
    the candidate's exact identifying metadata (slug, steward identity, private content)
    is strictly REDACTED from non-admin responses. The user is informed only that
    their submission is held for Family Trust review, protecting private memorial data.
    """
    stmt = select(Memorial).where(Memorial.deleted_at.is_(None))
    if exclude_memorial_id is not None:
        stmt = stmt.where(Memorial.id != exclude_memorial_id)

    existing = list(db.scalars(stmt))
    candidates: list[CandidateMatchSummary] = []
    has_high_confidence = False
    has_possible_match = False

    for mem in existing:
        # If caller is already primary steward of this memorial, skip self-collision
        is_own = any(s.user_id == actor.id and s.is_primary for s in mem.stewards)
        if is_own:
            continue

        score = calculate_identity_similarity(
            name_a=payload.full_name,
            birth_a=payload.birth_date,
            death_a=payload.death_date,
            loc_a=payload.birth_place or payload.resting_place,
            name_b=mem.full_name,
            birth_b=mem.birth_date,
            death_b=mem.death_date,
            loc_b=mem.birth_place or mem.resting_place,
        )

        if score.confidence_tier in ("high_confidence", "possible_match"):
            if score.confidence_tier == "high_confidence":
                has_high_confidence = True
            else:
                has_possible_match = True

            # Privacy check: If caller is admin, they see full candidate details.
            # If caller is an ordinary user and the candidate is NOT public, redact private fields.
            is_admin = actor.role == UserRole.ADMIN.value
            is_public = (
                mem.privacy == PrivacyLevel.PUBLIC.value
                and mem.publication_state == PublicationState.PUBLISHED.value
            )

            if is_admin or is_public:
                candidates.append(
                    CandidateMatchSummary(
                        id=str(mem.id),
                        fullName=mem.full_name,
                        birthDate=mem.birth_date,
                        deathDate=mem.death_date,
                        birthPlace=mem.birth_place,
                        similarityScore=score.composite_score,
                        confidenceTier=score.confidence_tier,
                        publicationState=mem.publication_state,
                        privacy=mem.privacy,
                    )
                )
            else:
                # Privacy redaction: caller is informed of a match without leaking private details
                candidates.append(
                    CandidateMatchSummary(
                        id="[PROTECTED_MEMORIAL]",
                        fullName="[Protected Record - Identity Held]",
                        birthDate="[Confidential]",
                        deathDate="[Confidential]",
                        birthPlace="[Confidential]",
                        similarityScore=score.composite_score,
                        confidenceTier=score.confidence_tier,
                        publicationState="held",
                        privacy="private",
                    )
                )

    if has_high_confidence:
        overall_tier = "high_confidence"
        requires_review = True
        message = (
            "We noticed an existing record that may represent the same person. "
            "To safeguard family dignity and protect against unauthorized duplication, "
            "your draft has been securely saved and routed to our Family Trust Desk "
            "for verification."
        )
    elif has_possible_match:
        overall_tier = "possible_match"
        requires_review = False
        message = (
            "We found potential similarities with existing records. Please review dates "
            "and details to ensure accuracy before publication."
        )
    else:
        overall_tier = "clear"
        requires_review = False
        message = "No conflicting duplicate records detected. You may proceed."

    return DuplicateScreeningOut(
        hasPotentialCollision=has_high_confidence or has_possible_match,
        confidenceTier=overall_tier,
        requiresAdminReview=requires_review,
        privacySafeMessage=message,
        candidateMatches=candidates
        if (actor.role == UserRole.ADMIN.value or not has_high_confidence)
        else candidates[:1],
    )


def merge_memorials(
    db: Session,
    *,
    canonical_id: uuid.UUID,
    duplicate_id: uuid.UUID,
    actor: User,
    request: Request | None = None,
    carry_over_tributes: bool = True,
    carry_over_media: bool = True,
    carry_over_timeline: bool = True,
    co_stewardship: bool = True,
) -> Memorial:
    """Merge duplicate memorial into canonical memorial with transactional audit trail."""
    if canonical_id == duplicate_id:
        raise ValidationError("Cannot merge a memorial into itself.")

    with transaction(db):
        canonical = db.scalar(
            select(Memorial).where(Memorial.id == canonical_id, Memorial.deleted_at.is_(None))
        )
        duplicate = db.scalar(
            select(Memorial).where(Memorial.id == duplicate_id, Memorial.deleted_at.is_(None))
        )

        if not canonical:
            raise NotFoundError("Canonical memorial not found.")
        if not duplicate:
            raise NotFoundError("Duplicate memorial not found.")

        # 1. Carry over timeline events
        if carry_over_timeline:
            for event in list(duplicate.timeline_events):
                event.memorial_id = canonical.id

        # 2. Carry over media items
        if carry_over_media:
            duplicate_media = list(
                db.scalars(select(MediaItem).where(MediaItem.memorial_id == duplicate.id))
            )
            for media in duplicate_media:
                media.memorial_id = canonical.id

        # 3. Carry over tributes
        if carry_over_tributes:
            duplicate_tributes = list(
                db.scalars(select(Tribute).where(Tribute.memorial_id == duplicate.id))
            )
            for tribute in duplicate_tributes:
                tribute.memorial_id = canonical.id

        # 4. Co-stewardship: add duplicate's stewards as contributors on canonical memorial
        if co_stewardship:
            for steward in duplicate.stewards:
                existing_member = any(s.user_id == steward.user_id for s in canonical.stewards)
                if not existing_member and steward.user_id:
                    contributor = MemorialContributor(
                        memorial_id=canonical.id,
                        user_id=steward.user_id,
                        role=ContributorRole.BIOGRAPHER.value,
                        status=ContributorStatus.ACTIVE.value,
                    )
                    db.add(contributor)

        # 5. Update duplicate memorial state to ARCHIVED / MERGED
        duplicate.publication_state = PublicationState.ARCHIVED.value
        duplicate.privacy = PrivacyLevel.PRIVATE.value
        duplicate.merged_into_id = canonical.id
        duplicate.dispute_status = "MERGED"

        # 6. Audit Trail
        audit_record(
            db,
            actor=actor,
            action=AuditAction.MEMORIAL_MERGED,
            entity="memorial",
            entity_id=canonical.id,
            request=request,
            detail={
                "canonical_id": str(canonical.id),
                "duplicate_id": str(duplicate.id),
                "canonical_slug": canonical.slug,
                "duplicate_slug": duplicate.slug,
                "co_stewardship": co_stewardship,
            },
        )

        # Invalidate public caches for both memorials
        from app.memorials.cache import invalidate_public_memorial_cache

        invalidate_public_memorial_cache(canonical.slug)
        invalidate_public_memorial_cache(duplicate.slug)

    return canonical
