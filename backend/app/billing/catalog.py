"""Authoritative pricing catalog, tier definitions, and seeding logic.

Values here are the sole source of truth for commercial billing in PITHROS.
No client-submitted prices or amounts are ever accepted.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.billing.models import Plan, PlanPrice
from app.core.enums import BillingInterval, PlanCode

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tier Defaults and Entitlement Specification
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TierLimits:
    max_memorials: int
    max_photos: int
    max_media_bytes: int  # Total media allowance across all types
    max_file_bytes: int  # Per-file photo upload ceiling (5MB Free / 10MB Paid)
    max_video_bytes: int
    max_audio_bytes: int  # Dedicated voice & audio allowance (100MB Care / 500MB Family)
    max_audio_file_bytes: int  # Per-file audio upload ceiling (50MB)
    max_documents: int
    max_contributors: int
    max_timeline_events: int
    max_daily_upload_attempts: int  # Abuse quota
    verification_enabled: bool
    archive_export_enabled: bool
    anniversary_notifications_enabled: bool
    legacy_links_enabled: bool
    premium_theme_enabled: bool


# Free Tier: Genuinely useful remembrance without charging for essentials.
# Allows basic identity and memorial creation (3 photos, 15 MB media,
# 5 timeline milestones, 1 additional contributor, unlimited tributes).
FREE_TIER_LIMITS = TierLimits(
    max_memorials=1,
    max_photos=3,
    max_media_bytes=15 * 1024 * 1024,  # 15 MB total media allowance
    max_file_bytes=5 * 1024 * 1024,  # 5 MB per photo
    max_video_bytes=0,
    max_audio_bytes=0,
    max_audio_file_bytes=0,
    max_documents=3,  # Sufficient for verification documents (certificate, ID, relation proof)
    max_contributors=1,  # Owner + 1 family contributor
    max_timeline_events=5,
    max_daily_upload_attempts=10,
    verification_enabled=False,
    archive_export_enabled=False,
    anniversary_notifications_enabled=False,
    legacy_links_enabled=False,
    premium_theme_enabled=False,
)

# Memorial Care: Single memorial complete care
# Calibrated V1: 30 photos, 300 MB total media, 100 MB voice (up to 60 mins),
# 50 MB max audio file, 50 milestones, 10 collaborators.
MEMORIAL_CARE_LIMITS = TierLimits(
    max_memorials=1,
    max_photos=30,
    max_media_bytes=300 * 1024 * 1024,  # 300 MB total media allowance
    max_file_bytes=10 * 1024 * 1024,  # 10 MB per photo
    max_video_bytes=0,  # Roadmap
    max_audio_bytes=100 * 1024 * 1024,  # 100 MB voice memories (~60 minutes audio)
    max_audio_file_bytes=50 * 1024 * 1024,  # 50 MB max per audio file
    max_documents=50,
    max_contributors=10,
    max_timeline_events=50,
    max_daily_upload_attempts=50,
    verification_enabled=True,
    archive_export_enabled=True,
    anniversary_notifications_enabled=True,
    legacy_links_enabled=True,
    premium_theme_enabled=True,
)

# Family Archive: Up to 5 memorials with shared preservation
# Shared 5-memorial capacity pool: 150 photos total (~30/memorial average),
# 1.5 GB total media, 500 MB voice archive across family.
FAMILY_ARCHIVE_LIMITS = TierLimits(
    max_memorials=5,
    max_photos=150,
    max_media_bytes=1500 * 1024 * 1024,  # 1.5 GB total media allowance
    max_file_bytes=10 * 1024 * 1024,  # 10 MB per photo
    max_video_bytes=0,
    max_audio_bytes=500 * 1024 * 1024,  # 500 MB voice & audio archive across family
    max_audio_file_bytes=50 * 1024 * 1024,  # 50 MB max per audio file
    max_documents=250,
    max_contributors=50,  # 10 per memorial
    max_timeline_events=250,
    max_daily_upload_attempts=100,
    verification_enabled=True,
    archive_export_enabled=True,
    anniversary_notifications_enabled=True,
    legacy_links_enabled=True,
    premium_theme_enabled=True,
)


# ---------------------------------------------------------------------------
# Initial Catalog Definition
# ---------------------------------------------------------------------------

CATALOG_PLANS: list[dict[str, Any]] = [
    {
        "code": PlanCode.MEMORIAL_CARE,
        "name": "PITHROS Memorial Care",
        "product_type": "memorial_care",
        "description": (
            "Complete digital memorial care for one loved one with up to 30 photographs "
            "(300 MB media), spoken voice memories (100 MB audio / up to 60 minutes), "
            "digital legacy links, PDF archive export, and family collaboration."
        ),
        "limits": MEMORIAL_CARE_LIMITS,
        "prices": [
            {
                "id": "memorial_care_monthly_v1",
                "billing_interval": BillingInterval.MONTHLY,
                "interval_count": 1,
                "amount_minor": 24900,  # ₹249.00
                "currency": "INR",
                "version": 1,
                "is_primary": False,
                "savings_copy": "Maximum flexibility",
                "monthly_equivalent_minor": 24900,
            },
            {
                "id": "memorial_care_half_yearly_v1",
                "billing_interval": BillingInterval.HALF_YEARLY,
                "interval_count": 6,
                "amount_minor": 64900,  # ₹649.00
                "currency": "INR",
                "version": 1,
                "is_primary": False,
                "savings_copy": "Save ₹845 vs monthly",
                "monthly_equivalent_minor": 10817,  # ₹108.17 / month
            },
            {
                "id": "memorial_care_annual_v1",
                "billing_interval": BillingInterval.ANNUAL,
                "interval_count": 12,
                "amount_minor": 99900,  # ₹999.00
                "currency": "INR",
                "version": 1,
                "is_primary": True,  # Primary Hero Price
                "savings_copy": "Save ₹1,989 vs monthly",
                "monthly_equivalent_minor": 8325,  # ₹83.25 / month
            },
        ],
    },
    {
        "code": PlanCode.FAMILY_ARCHIVE,
        "name": "PITHROS Family Archive",
        "product_type": "family_archive",
        "description": (
            "Unified remembrance archive preserving up to 5 family memorials with 150 "
            "shared photos (1.5 GB media), 500 MB voice archive, shared family management, "
            "and complete archive preservation."
        ),
        "limits": FAMILY_ARCHIVE_LIMITS,
        "prices": [
            {
                "id": "family_archive_annual_v1",
                "billing_interval": BillingInterval.ANNUAL,
                "interval_count": 12,
                "amount_minor": 299900,  # ₹2,999.00
                "currency": "INR",
                "version": 1,
                "is_primary": True,
                "savings_copy": "Save ₹1,996 vs 5 individual memorials",
                "monthly_equivalent_minor": 24992,  # ₹249.92 / month
            }
        ],
    },
    {
        "code": PlanCode.ADDITIONAL_MEMORIAL,
        "name": "Additional Memorial Slot",
        "product_type": "additional_memorial",
        "description": "Add 1 additional memorial slot to your existing active archive.",
        "limits": TierLimits(
            max_memorials=1,
            max_photos=30,
            max_media_bytes=300 * 1024 * 1024,
            max_file_bytes=10 * 1024 * 1024,
            max_video_bytes=0,
            max_audio_bytes=100 * 1024 * 1024,
            max_audio_file_bytes=50 * 1024 * 1024,
            max_documents=50,
            max_contributors=10,
            max_timeline_events=50,
            max_daily_upload_attempts=50,
            verification_enabled=True,
            archive_export_enabled=True,
            anniversary_notifications_enabled=True,
            legacy_links_enabled=True,
            premium_theme_enabled=True,
        ),
        "prices": [
            {
                "id": "additional_memorial_annual_v1",
                "billing_interval": BillingInterval.ANNUAL,
                "interval_count": 12,
                "amount_minor": 79900,  # ₹799.00
                "currency": "INR",
                "version": 1,
                "is_primary": False,
                "savings_copy": None,
                "monthly_equivalent_minor": 6658,
            }
        ],
    },
]


def seed_pricing_catalog(db: Session) -> dict[str, int]:
    """Idempotently seed the official pricing catalog into the database.
    Updates existing plans/prices or creates new rows as required.
    """
    plans_created = 0
    prices_created = 0

    for plan_data in CATALOG_PLANS:
        plan = db.execute(select(Plan).where(Plan.code == plan_data["code"])).scalar_one_or_none()

        if not plan:
            plan = Plan(
                code=plan_data["code"],
                name=plan_data["name"],
                description=plan_data["description"],
                product_type=plan_data["product_type"],
                active=True,
            )
            db.add(plan)
            db.flush()
            plans_created += 1
            logger.info("created_plan", extra={"code": plan.code})
        else:
            plan.name = plan_data["name"]
            plan.description = plan_data["description"]
            plan.product_type = plan_data["product_type"]
            plan.active = True

        for price_data in plan_data["prices"]:
            price = db.execute(
                select(PlanPrice).where(PlanPrice.id == price_data["id"])
            ).scalar_one_or_none()

            if not price:
                price = PlanPrice(
                    id=price_data["id"],
                    plan_id=plan.id,
                    billing_interval=price_data["billing_interval"],
                    interval_count=price_data["interval_count"],
                    amount_minor=price_data["amount_minor"],
                    currency=price_data["currency"],
                    version=price_data["version"],
                    active=True,
                    is_primary=price_data["is_primary"],
                    savings_copy=price_data["savings_copy"],
                    monthly_equivalent_minor=price_data["monthly_equivalent_minor"],
                )
                db.add(price)
                prices_created += 1
                logger.info("created_price", extra={"price_id": price.id})
            else:
                price.amount_minor = price_data["amount_minor"]
                price.currency = price_data["currency"]
                price.active = True
                price.is_primary = price_data["is_primary"]
                price.savings_copy = price_data["savings_copy"]
                price.monthly_equivalent_minor = price_data["monthly_equivalent_minor"]

    db.commit()
    return {"plans_seeded": plans_created, "prices_seeded": prices_created}
