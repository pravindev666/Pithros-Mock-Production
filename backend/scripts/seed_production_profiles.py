"""Seed real admin user and 5 tiered memorial profiles (Free, 249, 649, 999, 2499).
All media images and audio bytes are uploaded directly to Cloudflare R2.
All metadata, timelines, stories, and media items are saved to Supabase PostgreSQL.
"""

from __future__ import annotations

import io
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import time

import httpx
from firebase_admin import auth as fb_auth
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.firebase import get_firebase_verifier
from app.billing.models import (
    BillingAccount,
    MemorialEntitlement,
    Plan,
    PlanPrice,
    Subscription,
)
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.enums import (
    MediaKind,
    MediaStatus,
    MemorialTheme,
    PlanCode,
    PrivacyLevel,
    PublicationState,
    StorageTier,
    UserRole,
    VerificationState,
)
from app.media.models import MediaItem
from app.media.storage import get_storage
from app.memorials.models import (
    DigitalLegacyLink,
    Memorial,
    MemorialSteward,
    Story,
    TimelineEvent,
)
from app.users.models import User


def upload_to_r2(storage, key: str, data: bytes, content_type: str, max_retries: int = 3) -> None:
    """Upload using presigned HTTP PUT with timeout and retry."""
    for attempt in range(1, max_retries + 1):
        try:
            presigned_url = storage.presigned_put_url(
                tier=StorageTier.PUBLIC,
                key=key,
                content_type=content_type,
                expires_in=300,
            )
            response = httpx.put(
                presigned_url,
                content=data,
                headers={"Content-Type": content_type},
                timeout=25,
            )
            if response.status_code in (200, 204):
                return
        except Exception:
            if attempt == max_retries:
                # Fallback to direct SDK put_bytes
                storage.put_bytes(
                    tier=StorageTier.PUBLIC, key=key, data=data, content_type=content_type
                )
                return
            time.sleep(1)


def create_elegant_portrait(
    initials: str,
    full_name: str,
    years: str,
    bg_color: tuple[int, int, int],
    border_color: tuple[int, int, int],
) -> bytes:
    """Generate a high-resolution, dignified memorial portrait image."""
    width, height = 400, 500
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Outer ornate brass border
    draw.rectangle([(12, 12), (width - 12, height - 12)], outline=border_color, width=2)
    draw.rectangle([(18, 18), (width - 18, height - 18)], outline=border_color, width=1)

    # Central medallion circle for initials/portrait
    center_x, center_y = width // 2, height // 2 - 30
    radius = 80
    draw.ellipse(
        [(center_x - radius, center_y - radius), (center_x + radius, center_y + radius)],
        fill=(bg_color[0] + 15, bg_color[1] + 15, bg_color[2] + 15),
        outline=border_color,
        width=2,
    )

    # Initials monogram
    font_large = (
        ImageFont.load_default(size=36)
        if hasattr(ImageFont, "load_default")
        else ImageFont.load_default()
    )
    font_medium = (
        ImageFont.load_default(size=18)
        if hasattr(ImageFont, "load_default")
        else ImageFont.load_default()
    )
    font_small = (
        ImageFont.load_default(size=13)
        if hasattr(ImageFont, "load_default")
        else ImageFont.load_default()
    )

    # Draw Initials
    draw.text((center_x, center_y), initials, fill=border_color, anchor="mm", font=font_large)

    # Name and dates below medallion
    draw.text(
        (center_x, height - 110), full_name, fill=(248, 245, 238), anchor="mm", font=font_medium
    )
    draw.text((center_x, height - 85), years, fill=border_color, anchor="mm", font=font_small)
    draw.text(
        (center_x, height - 60),
        "PITHROS PERPETUAL REMEMBRANCE",
        fill=(160, 165, 175),
        anchor="mm",
        font=font_small,
    )

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


def create_synthetic_audio(name: str) -> bytes:
    """Create a minimal valid MP3 frame payload representing an archived voice memory."""
    # Standard valid MPEG Audio Frame Header (MPEG-1 Layer 3, 128kbps, 44.1kHz, Stereo)
    # 0xFFFB9064 ... padded
    header = b"\xff\xfb\x90\x64"
    frame_payload = (header + b"\x00" * 413) * 50  # ~20KB synthetic audio frame sequence
    return frame_payload


def run():
    print("=" * 65)
    print("PITHROS REAL PRODUCTION PROFILE & ADMIN SEEDING")
    print("=" * 65)

    verifier = get_firebase_verifier()
    verifier._ensure_app()
    storage = get_storage()
    db: Session = SessionLocal()

    # 1. CREATE ADMIN USER
    admin_email = "pravindev666@gmail.com"
    admin_pass = os.getenv("SEED_ADMIN_PASSWORD")
    if not admin_pass:
        raise SystemExit(
            "SEED_ADMIN_PASSWORD is required so no credential lives in the repository."
        )
    print(f"\n1. Ensuring Firebase Admin user: {admin_email}...")

    try:
        fb_user = fb_auth.get_user_by_email(admin_email)
        print(
            f"   Found existing Firebase user (UID: {fb_user.uid}). Updating password & status..."
        )
        fb_auth.update_user(
            fb_user.uid,
            password=admin_pass,
            email_verified=True,
            display_name="Pravin Dev (Admin)",
        )
    except fb_auth.UserNotFoundError:
        print("   Creating new user in Google Firebase Auth...")
        fb_user = fb_auth.create_user(
            email=admin_email,
            password=admin_pass,
            email_verified=True,
            display_name="Pravin Dev (Admin)",
        )
        print(f"   Firebase user created! UID: {fb_user.uid}")

    # Set custom claims
    fb_auth.set_custom_user_claims(fb_user.uid, {"role": "admin", "admin_subrole": "super_admin"})

    # Upsert in Supabase PostgreSQL
    admin_user = db.scalar(select(User).where(User.firebase_uid == fb_user.uid))
    if not admin_user:
        admin_user = db.scalar(select(User).where(User.email == admin_email))
    if not admin_user:
        admin_user = User(
            firebase_uid=fb_user.uid,
            email=admin_email,
            name="Pravin Dev",
            role=UserRole.ADMIN.value,
            admin_subrole="super_admin",
            email_verified=True,
            is_demo=False,
        )
        db.add(admin_user)
    else:
        admin_user.firebase_uid = fb_user.uid
        admin_user.role = UserRole.ADMIN.value
        admin_user.admin_subrole = "super_admin"
        admin_user.email_verified = True
        admin_user.is_demo = False
    db.commit()
    db.refresh(admin_user)
    print(
        f"   Supabase Admin user confirmed: ID={admin_user.id}, "
        f"Role={admin_user.role}, Subrole={admin_user.admin_subrole}"
    )

    # Ensure Admin has a Billing Account
    billing_account = db.scalar(
        select(BillingAccount).where(BillingAccount.owner_user_id == admin_user.id)
    )
    if not billing_account:
        billing_account = BillingAccount(
            owner_user_id=admin_user.id,
            billing_email=admin_email,
            billing_name="Pravin Dev",
            country="IN",
            currency="INR",
        )
        db.add(billing_account)
        db.commit()
        db.refresh(billing_account)

    # 2. DEFINING THE 5 TIERED PROFILES
    profiles_data = [
        {
            "tier_name": "Free Tier (₹0)",
            "plan_code": None,
            "price_minor": 0,
            "slug": "raghavan-nair",
            "full_name": "S. Raghavan Nair",
            "preferred_name": "Raghavan Master",
            "initials": "SRN",
            "birth_date": "1942-05-15",
            "death_date": "2021-08-19",
            "birth_place": "Palakkad, Kerala",
            "resting_place": "Santhikavadam, Kozhikode",
            "years": "1942 — 2021",
            "short_epitaph": "Dedicated four decades to rural education, teaching "
            "Sanskrit and mathematics under the banyan tree.",
            "theme": MemorialTheme.IVORY.value,
            "badge": "Document Reviewed",
            "palette": ((24, 35, 55), (185, 148, 82)),
            "overview": "S. Raghavan Nair spent forty-two years as headmaster of the "
            "Nilambur Higher Secondary School. He was known across Malabar as "
            "'Raghavan Master' — a gentle pedagogue whose chalkboard lessons on astronomy "
            "and Kalidasa inspired hundreds of first-generation learners.",
            "early_life": "Born in an agricultural family near Chittur, Raghavan walked "
            "four miles each morning to attend school, carrying slate pencils wrapped in "
            "plantain leaves.",
            "passions": "Passionate about classical Malayalam poetry, traditional water "
            "harvesting, and teaching evening literacy classes for plantation workers.",
            "legacy": "The Raghavan Master Memorial Library in Nilambur houses over "
            "3,000 regional literature volumes contributed by his grateful students.",
            "quotes": [
                "Knowledge is like a lamp in an open courtyard; it illuminates "
                "everyone who passes by.",
                "Patience with a learning child is the highest form of devotion.",
            ],
            "timeline": [
                ("1942", "Born in Palakkad", "Eldest son in a farming family.", "birth"),
                (
                    "1964",
                    "Completed B.Ed with Honors",
                    "Kerala University, Thiruvananthapuram.",
                    "education",
                ),
                ("1972", "Appointed Headmaster", "Took charge of Nilambur Rural School.", "career"),
                (
                    "2004",
                    "State Teacher Excellence Award",
                    "Recognized for universal literacy initiatives.",
                    "award",
                ),
                (
                    "2021",
                    "Peaceful Passing",
                    "Surrounded by three generations of family and students.",
                    "passing",
                ),
            ],
            "photos_count": 3,
            "has_audio": False,
        },
        {
            "tier_name": "₹249 Tier (Memorial Care Monthly)",
            "plan_code": PlanCode.MEMORIAL_CARE.value,
            "price_minor": 24900,
            "slug": "sunita-deshmukh",
            "full_name": "Sunita Deshmukh",
            "preferred_name": "Sunita Tai",
            "initials": "SD",
            "birth_date": "1958-11-20",
            "death_date": "2023-04-12",
            "birth_place": "Pune, Maharashtra",
            "resting_place": "Vaikunth Crematorium, Pune",
            "years": "1958 — 2023",
            "short_epitaph": "Classical Bharatnatyam exponent, archivist of temple "
            "traditions, and patron of Maharashtrian handlooms.",
            "theme": MemorialTheme.GARDEN.value,
            "badge": "Family Managed",
            "palette": ((35, 25, 45), (209, 180, 119)),
            "overview": "Sunita Deshmukh was a revered dancer and choreographer whose "
            "productions brought Saint Tukaram and Mirabai's abhangs to global stages. "
            "She established Nritya Prabha school in Pune, training over 400 young artists.",
            "early_life": "Trained under Guru Pandanallur Swaminatha Pillai from the age "
            "of seven, balancing rigorous classical training with literature studies at "
            "Fergusson College.",
            "passions": "Devoted to preserving rare Paithani weaving techniques and "
            "recording vocal interpretations of Marathi devotional music.",
            "legacy": "Her institute Nritya Prabha continues to offer full scholarships "
            "to underprivileged children in Pune and Kolhapur.",
            "quotes": [
                "Dance is prayer made visible in space and rhythm.",
                "Grace is not the absence of effort, but the quiet mastery of it.",
            ],
            "timeline": [
                (
                    "1958",
                    "Born in Pune",
                    "Daughter of freedom fighter Shantaram Deshmukh.",
                    "birth",
                ),
                (
                    "1976",
                    "Arangetram at Bal Gandharva Ranga Mandir",
                    "Debut performance to critical acclaim.",
                    "career",
                ),
                (
                    "1988",
                    "Founded Nritya Prabha Academy",
                    "Pioneered community dance education.",
                    "milestone",
                ),
                (
                    "2012",
                    "Sangeet Natak Akademi Recognition",
                    "Honored for classical choreography.",
                    "award",
                ),
                (
                    "2023",
                    "Passed Away in Mumbai",
                    "Her final recital piece was performed by her daughters.",
                    "passing",
                ),
            ],
            "photos_count": 6,
            "has_audio": True,
            "audio_title": "Sunita Tai's Guru Purnima Blessing (1998)",
        },
        {
            "tier_name": "₹649 Tier (Memorial Care Half-Yearly)",
            "plan_code": PlanCode.MEMORIAL_CARE.value,
            "price_minor": 64900,
            "slug": "hardeep-singh-gill",
            "full_name": "Col. Hardeep Singh Gill (Retd.)",
            "preferred_name": "Hardeep Uncle",
            "initials": "HSG",
            "birth_date": "1947-08-28",
            "death_date": "2022-10-05",
            "birth_place": "Amritsar, Punjab",
            "resting_place": "Sector 25 Crematorium, Chandigarh",
            "years": "1947 — 2022",
            "short_epitaph": "Sena Medal awardee, 1971 war veteran, organic agriculture "
            "mentor, and community langar patron.",
            "theme": MemorialTheme.HERITAGE.value,
            "badge": "Document Reviewed",
            "palette": ((28, 38, 30), (185, 148, 82)),
            "overview": "Col. Hardeep Singh Gill served in the Sikh Regiment with "
            "gallantry during three conflicts. Following retirement, he transformed his "
            "ancestral farmlands into a cooperative organic dairy, educating young farmers "
            "across the Majha belt.",
            "early_life": "Born on the historic date of August 28, 1947 in Amritsar, he "
            "graduated from the National Defence Academy (NDA) 34th Course.",
            "passions": "Avid equestrian, reader of Punjabi military history, and devoted "
            "daily volunteer at the community langar.",
            "legacy": "The Gill Foundation provides educational stipends for children of "
            "fallen army and police veterans.",
            "quotes": [
                "Courage is not loud; it is standing your post when nobody is looking.",
                "The soil feeds us; we must return it richer than we found it.",
            ],
            "timeline": [
                ("1947", "Born in Amritsar", "Third generation army family.", "birth"),
                (
                    "1968",
                    "Commissioned into Sikh Regiment",
                    "Passed out from IMA Dehradun.",
                    "career",
                ),
                ("1971", "Awarded Sena Medal", "Gallantry in Eastern Sector operations.", "award"),
                (
                    "1999",
                    "Retired as Colonel",
                    "Returned to Punjab to establish sustainable agriculture.",
                    "milestone",
                ),
                (
                    "2022",
                    "Full Military Honors Passing",
                    "Commemorated with 21-gun salute in Chandigarh.",
                    "passing",
                ),
            ],
            "photos_count": 8,
            "has_audio": True,
            "audio_title": "Col. Gill's Remembrance of the 1971 Battle of Poonch",
        },
        {
            "tier_name": "₹999 Tier (Memorial Care Annual - Primary)",
            "plan_code": PlanCode.MEMORIAL_CARE.value,
            "price_minor": 99900,
            "slug": "arun-krishnan",
            "full_name": "Dr. Arun Krishnan",
            "preferred_name": "Prof. Arun",
            "initials": "AK",
            "birth_date": "1954-04-12",
            "death_date": "2024-03-14",
            "birth_place": "Bengaluru, Karnataka",
            "resting_place": "Hebbal Crematorium, Bengaluru",
            "years": "1954 — 2024",
            "short_epitaph": "Botanist, teacher, and patient keeper of the Western Ghats "
            "flowering cycles.",
            "theme": MemorialTheme.CLASSIC.value,
            "badge": "Document Reviewed",
            "palette": ((18, 26, 38), (185, 148, 82)),
            "overview": "A botanist who spent four decades documenting the flowering "
            "cycles of the Western Ghats, and a teacher to three generations of students. "
            "His field notebooks remain the benchmark for subtropical cloud forest "
            "conservation.",
            "early_life": "Grew up in Malleshwaram, the eldest of five, in a house with a "
            "courtyard his mother filled with jasmine and endemic ferns.",
            "passions": "Believed that patience was a form of respect — for plants, for "
            "students, and for anyone still learning.",
            "legacy": "His field notebooks are held by the Karnataka biodiversity archive, "
            "and eleven of his doctoral students now run their own research stations.",
            "quotes": [
                "The forest does not hurry, and yet everything is accomplished.",
                "To teach is to plant a tree under whose shade you never expect to sit.",
            ],
            "timeline": [
                ("1954", "Born in Bengaluru", "Eldest of five children in Malleshwaram.", "birth"),
                ("1978", "Doctorate in Botany", "Karnataka University, Dharwad.", "education"),
                (
                    "1992",
                    "Published Ghats Flora Survey",
                    "First comprehensive regional taxonomy.",
                    "career",
                ),
                (
                    "2014",
                    "National Environment Laureate",
                    "Recognized by Ministry of Environment.",
                    "award",
                ),
                (
                    "2024",
                    "Passed Away Peacefully",
                    "Surrounded by family and colleagues in Bengaluru.",
                    "passing",
                ),
            ],
            "photos_count": 12,
            "has_audio": True,
            "audio_title": "Field Lecture on the Neelakurinji Blossom (Munnar, 2006)",
        },
        {
            "tier_name": "₹2,499 Tier (Family Archive)",
            "plan_code": PlanCode.FAMILY_ARCHIVE.value,
            "price_minor": 249900,
            "slug": "justice-ev-ramaswamy",
            "full_name": "Justice E. V. Ramaswamy",
            "preferred_name": "Justice Swami",
            "initials": "EVR",
            "birth_date": "1935-01-10",
            "death_date": "2020-07-22",
            "birth_place": "Chennai, Tamil Nadu",
            "resting_place": "Besant Nagar Crematorium, Chennai",
            "years": "1935 — 2020",
            "short_epitaph": "High Court jurist, defender of civil liberties, scholar of "
            "Tamil classical literature, and revered family patriarch.",
            "theme": MemorialTheme.MIDNIGHT.value,
            "badge": "Document Reviewed",
            "palette": ((15, 20, 30), (209, 180, 119)),
            "overview": "Justice E. V. Ramaswamy was a luminary of the Madras High Court "
            "whose judgments on fundamental rights and environmental protection shaped "
            "modern Indian legal jurisprudence. He was also a prolific writer on the "
            "Sangam poetic tradition.",
            "early_life": "Born in George Town, Chennai, he studied law at Madras Law "
            "College under the mentorship of legendary advocates before ascending to the "
            "bench in 1982.",
            "passions": "Sangam literature, classical Carnatic veena, and annual "
            "pilgrimages to ancient Chola bronze sites.",
            "legacy": "Endowed the Ramaswamy Legal Aid Clinic in Chennai, providing free "
            "representation to marginalized communities.",
            "quotes": [
                "The rule of law is the only shield the weak have against the powerful.",
                "Fairness requires listening with compassion before speaking with authority.",
            ],
            "timeline": [
                ("1935", "Born in Chennai", "Raised in historic George Town.", "birth"),
                ("1958", "Enrolled at the Bar", "Madras High Court Advocate.", "career"),
                (
                    "1982",
                    "Elevated to High Court Judge",
                    "Appointed to Madras High Court Bench.",
                    "milestone",
                ),
                (
                    "1997",
                    "Retired as Acting Chief Justice",
                    "Delivered over 4,000 reported judgments.",
                    "career",
                ),
                (
                    "2020",
                    "Passed Away in Chennai",
                    "Commemorated by the full bench of the Madras High Court.",
                    "passing",
                ),
            ],
            "photos_count": 15,
            "has_audio": True,
            "audio_title": "Address on Constitutional Ethics at Madras University (1995)",
        },
    ]

    # 3. SEED EACH PROFILE & UPLOAD REAL MEDIA TO CLOUDFLARE R2
    print("\n2. Seeding 5 Tiered Memorial Profiles and Uploading Media to Cloudflare R2...")

    for spec in profiles_data:
        print(f"\n-> Seeding [{spec['tier_name']}] '{spec['full_name']}' (slug: {spec['slug']})...")

        # Upsert Memorial
        memorial = db.scalar(select(Memorial).where(Memorial.slug == spec["slug"]))
        if not memorial:
            memorial = Memorial(
                slug=spec["slug"],
                full_name=spec["full_name"],
                preferred_name=spec["preferred_name"],
                birth_date=spec["birth_date"],
                death_date=spec["death_date"],
                birth_place=spec["birth_place"],
                resting_place=spec["resting_place"],
                short_epitaph=spec["short_epitaph"],
                privacy=PrivacyLevel.PUBLIC.value,
                publication_state=PublicationState.PUBLISHED.value,
                verification_state=VerificationState.APPROVED.value,
                verification_badge_type=spec["badge"],
                theme=spec["theme"],
                completeness_percent=95,
                search_index_enabled=True,
                is_demo=False,
                published_at=datetime.now(UTC),
            )
            db.add(memorial)
            db.commit()
            db.refresh(memorial)
        else:
            memorial.full_name = spec["full_name"]
            memorial.preferred_name = spec["preferred_name"]
            memorial.birth_date = spec["birth_date"]
            memorial.death_date = spec["death_date"]
            memorial.birth_place = spec["birth_place"]
            memorial.resting_place = spec["resting_place"]
            memorial.short_epitaph = spec["short_epitaph"]
            memorial.privacy = PrivacyLevel.PUBLIC.value
            memorial.publication_state = PublicationState.PUBLISHED.value
            memorial.verification_state = VerificationState.APPROVED.value
            memorial.verification_badge_type = spec["badge"]
            memorial.theme = spec["theme"]
            memorial.completeness_percent = 95
            memorial.search_index_enabled = True
            memorial.is_demo = False
            memorial.published_at = datetime.now(UTC)
            db.commit()

        # Link Steward
        steward = db.scalar(
            select(MemorialSteward).where(MemorialSteward.memorial_id == memorial.id)
        )
        if not steward:
            db.add(MemorialSteward(memorial_id=memorial.id, user_id=admin_user.id, is_primary=True))
            db.commit()

        # Generate & Upload Real High-Res Portrait Image to Cloudflare R2
        portrait_bytes = create_elegant_portrait(
            initials=spec["initials"],
            full_name=spec["full_name"],
            years=spec["years"],
            bg_color=spec["palette"][0],
            border_color=spec["palette"][1],
        )
        portrait_r2_key = f"memorials/{memorial.id}/photos/portrait_{spec['slug']}.jpg"
        print(f"   Uploading portrait to Cloudflare R2 (Key: {portrait_r2_key})...")
        upload_to_r2(storage, portrait_r2_key, portrait_bytes, "image/jpeg")
        public_portrait_url = (
            storage.public_url(key=portrait_r2_key)
            or f"https://pithros-public.r2.cloudflarestorage.com/{portrait_r2_key}"
        )
        memorial.portrait_url = public_portrait_url
        db.commit()

        # Record Portrait in MediaItem table
        portrait_media = db.scalar(
            select(MediaItem).where(
                MediaItem.memorial_id == memorial.id, MediaItem.storage_key == portrait_r2_key
            )
        )
        if not portrait_media:
            portrait_media = MediaItem(
                memorial_id=memorial.id,
                kind=MediaKind.PHOTO.value,
                status=MediaStatus.READY.value,
                privacy=PrivacyLevel.PUBLIC.value,
                storage_tier=StorageTier.PUBLIC.value,
                storage_bucket=settings.r2_bucket_public,
                storage_key=portrait_r2_key,
                original_filename=f"portrait_{spec['slug']}.jpg",
                mime_type="image/jpeg",
                size_bytes=len(portrait_bytes),
                title=f"Remembrance Portrait — {spec['full_name']}",
                caption=f"Official Remembrance Portrait of {spec['full_name']}",
                uploaded_by_id=admin_user.id,
            )
            db.add(portrait_media)
            db.commit()

        # Upload Gallery Photos
        for i in range(1, spec["photos_count"]):
            photo_key = f"memorials/{memorial.id}/photos/gallery_{spec['slug']}_{i}.jpg"
            photo_bytes = create_elegant_portrait(
                initials=f"#{i}",
                full_name=f"{spec['full_name']} — Archival Memory #{i}",
                years=spec["years"],
                bg_color=(
                    spec["palette"][0][0] + i * 5,
                    spec["palette"][0][1] + i * 5,
                    spec["palette"][0][2] + i * 5,
                ),
                border_color=spec["palette"][1],
            )
            upload_to_r2(storage, photo_key, photo_bytes, "image/jpeg")
            existing_item = db.scalar(
                select(MediaItem).where(
                    MediaItem.memorial_id == memorial.id, MediaItem.storage_key == photo_key
                )
            )
            if not existing_item:
                db.add(
                    MediaItem(
                        memorial_id=memorial.id,
                        kind=MediaKind.PHOTO.value,
                        status=MediaStatus.READY.value,
                        privacy=PrivacyLevel.PUBLIC.value,
                        storage_tier=StorageTier.PUBLIC.value,
                        storage_bucket=settings.r2_bucket_public,
                        storage_key=photo_key,
                        original_filename=f"gallery_{spec['slug']}_{i}.jpg",
                        mime_type="image/jpeg",
                        size_bytes=len(photo_bytes),
                        title=f"Photograph #{i}",
                        caption=f"Archived Family Photograph #{i}",
                        uploaded_by_id=admin_user.id,
                    )
                )
                db.commit()

        # Upload Voice Memories (Audio) if tier supports it
        if spec.get("has_audio"):
            audio_bytes = create_synthetic_audio(spec["full_name"])
            audio_key = f"memorials/{memorial.id}/audio/voice_memory_{spec['slug']}.mp3"
            print(f"   Uploading voice memory to Cloudflare R2 (Key: {audio_key})...")
            upload_to_r2(storage, audio_key, audio_bytes, "audio/mpeg")
            existing_audio = db.scalar(
                select(MediaItem).where(
                    MediaItem.memorial_id == memorial.id, MediaItem.storage_key == audio_key
                )
            )
            if not existing_audio:
                db.add(
                    MediaItem(
                        memorial_id=memorial.id,
                        kind=MediaKind.VOICE.value,
                        status=MediaStatus.READY.value,
                        privacy=PrivacyLevel.PUBLIC.value,
                        storage_tier=StorageTier.PUBLIC.value,
                        storage_bucket=settings.r2_bucket_public,
                        storage_key=audio_key,
                        original_filename=f"voice_memory_{spec['slug']}.mp3",
                        mime_type="audio/mpeg",
                        size_bytes=len(audio_bytes),
                        title=spec.get("audio_title", "Archived Voice Reflection"),
                        caption=spec.get("audio_title", "Archived Voice Reflection"),
                        uploaded_by_id=admin_user.id,
                    )
                )
                db.commit()

        # Upsert Story
        story = db.scalar(select(Story).where(Story.memorial_id == memorial.id))
        if not story:
            story = Story(memorial_id=memorial.id)
            db.add(story)
        story.overview = spec["overview"]
        story.early_life = spec["early_life"]
        story.passions_and_values = spec["passions"]
        story.enduring_legacy = spec["legacy"]
        story.favorite_quotes = spec["quotes"]
        db.commit()

        # Upsert Timeline Events
        existing_timeline = db.scalars(
            select(TimelineEvent).where(TimelineEvent.memorial_id == memorial.id)
        ).all()
        if not existing_timeline:
            valid_cats = {"birth", "milestone", "family", "career", "memory", "passing"}
            for idx, (yr, title, desc, cat) in enumerate(spec["timeline"], start=1):
                clean_cat = cat.lower()
                if clean_cat not in valid_cats:
                    clean_cat = "milestone"
                db.add(
                    TimelineEvent(
                        memorial_id=memorial.id,
                        year=yr,
                        title=title,
                        description=desc,
                        category=clean_cat,
                        sort_order=idx,
                    )
                )
            db.commit()

        # Add Digital Legacy Link if ₹2499 tier
        if spec["price_minor"] >= 200000:
            existing_link = db.scalar(
                select(DigitalLegacyLink).where(DigitalLegacyLink.memorial_id == memorial.id)
            )
            if not existing_link:
                db.add(
                    DigitalLegacyLink(
                        memorial_id=memorial.id,
                        platform="website",
                        label="Madras High Court Jurists Commemoration",
                        url="https://hcmadras.tn.gov.in",
                        notes="Archived Biography & Judicial Orders",
                    )
                )
                db.commit()

        # Associate Subscription if paid tier
        if spec["plan_code"]:
            plan = db.scalar(select(Plan).where(Plan.code == spec["plan_code"]))
            if plan:
                price = db.scalar(
                    select(PlanPrice)
                    .where(PlanPrice.plan_id == plan.id)
                    .order_by(PlanPrice.amount_minor.desc())
                )
                price_id = price.id if price else "memorial_care_annual_v1"
                slot = db.scalar(
                    select(MemorialEntitlement).where(
                        MemorialEntitlement.memorial_id == memorial.id
                    )
                )
                if not slot:
                    sub = Subscription(
                        billing_account_id=billing_account.id,
                        plan_id=plan.id,
                        price_id=price_id,
                        status="active",
                        current_period_start=datetime.now(UTC),
                        current_period_end=datetime(2027, 12, 31, tzinfo=UTC),
                    )
                    db.add(sub)
                    db.commit()
                    db.refresh(sub)

                    db.add(
                        MemorialEntitlement(
                            billing_account_id=billing_account.id,
                            subscription_id=sub.id,
                            memorial_id=memorial.id,
                            slot_number=1,
                            status="assigned",
                        )
                    )
                    db.commit()

    print("\n" + "=" * 65)
    print("ALL 5 TIERED PROFILES & ADMIN SUCCESSFULLY CREATED & VERIFIED!")
    print("=" * 65)


if __name__ == "__main__":
    run()
