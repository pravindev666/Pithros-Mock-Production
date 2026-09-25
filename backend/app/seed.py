"""Development seed data.

    python -m app.seed

Idempotent: re-running updates the demo rows rather than duplicating them. Every
row created here is flagged `is_demo`, so demo content is always distinguishable
from real accounts. Refuses to run against production.
"""

from __future__ import annotations

import logging
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.enums import (
    ContributorRole,
    ContributorStatus,
    MemorialTheme,
    PrivacyLevel,
    PublicationState,
    UserRole,
    VerificationState,
)
from app.memorials.models import (
    DigitalLegacyLink,
    Memorial,
    MemorialContributor,
    MemorialSteward,
    Story,
    TimelineEvent,
)
from app.users.models import User

logger = logging.getLogger("pithros.seed")

DEMO_USERS = [
    {
        "firebase_uid": "demo_steward_anita",
        "email": "anita.k@example.com",
        "name": "Anita Krishnan",
        "role": UserRole.FAMILY_STEWARD.value,
    },
    {
        "firebase_uid": "demo_contributor_vikram",
        "email": "vikram.k@example.com",
        "name": "Vikram Krishnan",
        "role": UserRole.FAMILY_CONTRIBUTOR.value,
    },
    {
        "firebase_uid": "demo_admin_sarah",
        "email": "admin@pithros.org",
        "name": "Sarah Chen",
        "role": UserRole.ADMIN.value,
        "admin_subrole": "super_admin",
    },
]

DEMO_MEMORIALS: list[dict] = [
    {
        "slug": "arun-krishnan",
        "full_name": "Dr. Arun Krishnan",
        "birth_date": "1954-04-12",
        "death_date": "2024-03-14",
        "birth_place": "Bengaluru, India",
        "resting_place": "Hebbal Crematorium, Bengaluru",
        "short_epitaph": "Botanist, teacher, and patient keeper of the Western Ghats.",
        "privacy": PrivacyLevel.PUBLIC.value,
        "publication_state": PublicationState.PUBLISHED.value,
        "verification_state": VerificationState.APPROVED.value,
        "verification_badge_type": "Document Reviewed",
        "theme": MemorialTheme.CLASSIC.value,
        "story": {
            "overview": "A botanist who spent four decades documenting the flowering cycles "
            "of the Western Ghats, and a teacher to three generations of students.",
            "early_life": "Grew up in Malleshwaram, the eldest of five, in a house with a "
            "courtyard his mother filled with jasmine.",
            "passions_and_values": "Believed that patience was a form of respect — for "
            "plants, for students, and for anyone still learning.",
            "enduring_legacy": "His field notebooks are held by the Karnataka biodiversity "
            "archive, and eleven of his students now run their own research stations.",
            "favorite_quotes": [
                "The forest does not hurry, and yet everything is accomplished.",
            ],
        },
        "timeline": [
            ("1954", "Born in Bengaluru", "The eldest of five children.", "birth"),
            ("1978", "Doctorate in Botany", "Karnataka University.", "career"),
            (
                "1992",
                "Published the Ghats Flora Survey",
                "First comprehensive regional survey.",
                "career",
            ),
            ("2024", "Passed away peacefully", "Surrounded by family in Bengaluru.", "passing"),
        ],
    },
    {
        "slug": "meera-iyer",
        "full_name": "Meera Iyer",
        "birth_date": "1938-09-02",
        "death_date": "2023-11-08",
        "birth_place": "Chennai, India",
        "resting_place": None,
        "short_epitaph": "Carnatic vocalist and teacher to hundreds.",
        "privacy": PrivacyLevel.FAMILY.value,
        "publication_state": PublicationState.DRAFT.value,
        "verification_state": VerificationState.DRAFT.value,
        "verification_badge_type": None,
        "theme": MemorialTheme.CANDLELIGHT.value,
        "story": {
            "overview": "A Carnatic vocalist who taught for fifty years from a small room in "
            "Mylapore, and never turned away a student who could not pay.",
            "early_life": None,
            "passions_and_values": None,
            "enduring_legacy": None,
            "favorite_quotes": [],
        },
        "timeline": [],
    },
]

DEMO_CONTRIBUTORS = [
    {"email": "vikram.k@example.com", "role": ContributorRole.BIOGRAPHER.value},
    {"email": "anita.k@example.com", "role": ContributorRole.VIEWER.value},
]


def _upsert_user(db: Session, spec: dict) -> User:
    user = db.scalar(select(User).where(User.firebase_uid == spec["firebase_uid"]))
    if user is None:
        user = User(firebase_uid=spec["firebase_uid"], is_demo=True)
        db.add(user)

    user.email = spec["email"]
    user.name = spec["name"]
    user.role = spec["role"]
    user.admin_subrole = spec.get("admin_subrole")
    user.email_verified = True
    user.is_demo = True
    db.flush()
    return user


def _upsert_memorial(db: Session, spec: dict, steward: User) -> Memorial:
    memorial = db.scalar(select(Memorial).where(Memorial.slug == spec["slug"]))
    if memorial is None:
        # Constructed with its required columns already set — flushing a partially
        # populated row would violate the NOT NULL constraints.
        memorial = Memorial(
            slug=spec["slug"],
            full_name=spec["full_name"],
            is_demo=True,
        )
        db.add(memorial)

    memorial.full_name = spec["full_name"]
    memorial.birth_date = spec["birth_date"]
    memorial.death_date = spec["death_date"]
    memorial.birth_place = spec["birth_place"]
    memorial.resting_place = spec["resting_place"]
    memorial.short_epitaph = spec["short_epitaph"]
    memorial.privacy = spec["privacy"]
    memorial.publication_state = spec["publication_state"]
    memorial.verification_state = spec["verification_state"]
    memorial.verification_badge_type = spec["verification_badge_type"]
    memorial.theme = spec["theme"]
    memorial.completeness_percent = 85
    memorial.is_demo = True
    db.flush()

    if not db.scalar(select(MemorialSteward).where(MemorialSteward.memorial_id == memorial.id)):
        db.add(MemorialSteward(memorial_id=memorial.id, user_id=steward.id, is_primary=True))

    story = db.scalar(select(Story).where(Story.memorial_id == memorial.id))
    if story is None:
        story = Story(memorial_id=memorial.id)
        db.add(story)
    story.overview = spec["story"]["overview"]
    story.early_life = spec["story"]["early_life"]
    story.passions_and_values = spec["story"]["passions_and_values"]
    story.enduring_legacy = spec["story"]["enduring_legacy"]
    story.favorite_quotes = list(spec["story"]["favorite_quotes"])
    db.flush()

    if not db.scalar(select(TimelineEvent).where(TimelineEvent.memorial_id == memorial.id)):
        for order, (year, title, description, category) in enumerate(spec["timeline"], start=1):
            db.add(
                TimelineEvent(
                    memorial_id=memorial.id,
                    year=year,
                    title=title,
                    description=description,
                    category=category,
                    sort_order=order,
                )
            )

    if not db.scalar(select(DigitalLegacyLink).where(DigitalLegacyLink.memorial_id == memorial.id)):
        db.add(
            DigitalLegacyLink(
                memorial_id=memorial.id,
                platform="website",
                label="Karnataka biodiversity archive",
                url="https://example.org/archive",
                notes="Field notebooks, digitised.",
            )
        )

    db.flush()
    return memorial


def _upsert_contributors(db: Session, memorial: Memorial, specs: list[dict]) -> None:
    primary = memorial.primary_steward

    for spec in specs:
        user = db.scalar(select(User).where(User.email == spec["email"]))
        if user is None:
            continue
        if primary is not None and primary.user_id == user.id:
            continue

        existing = db.scalar(
            select(MemorialContributor).where(
                MemorialContributor.memorial_id == memorial.id,
                MemorialContributor.user_id == user.id,
            )
        )
        if existing is not None:
            continue

        db.add(
            MemorialContributor(
                memorial_id=memorial.id,
                user_id=user.id,
                role=spec["role"],
                status=ContributorStatus.ACTIVE.value,
                invited_email=user.email,
            )
        )


def seed() -> int:
    if settings.is_production:
        sys.stderr.write("Refusing to seed a production database.\n")
        return 1

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    with SessionLocal() as db:
        users = {spec["email"]: _upsert_user(db, spec) for spec in DEMO_USERS}
        steward = users["anita.k@example.com"]

        for spec in DEMO_MEMORIALS:
            memorial = _upsert_memorial(db, spec, steward)
            _upsert_contributors(db, memorial, DEMO_CONTRIBUTORS)

        db.commit()

    logger.info(
        "Seeded %d demo users and %d demo memorials (all flagged is_demo=true).",
        len(DEMO_USERS),
        len(DEMO_MEMORIALS),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(seed())
