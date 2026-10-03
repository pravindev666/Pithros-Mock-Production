import os
import uuid

import firebase_admin.auth as fb_auth
from sqlalchemy import select

from app.auth.dependencies import get_firebase_verifier
from app.billing.models import BillingAccount
from app.core.database import SessionLocal
from app.memorials.models import Memorial, MemorialSteward
from app.users.models import User

STEWARDS = [
    {
        "slug": "raghavan-nair",
        "email": "steward.raghavan@pithros.com",
        "name": "Murali Raghavan",
        "relationship": "Eldest Son",
        "phone": "+91 94471 23456",
    },
    {
        "slug": "sunita-deshmukh",
        "email": "steward.sunita@pithros.com",
        "name": "Pooja Deshmukh Kulkarni",
        "relationship": "Daughter",
        "phone": "+91 98220 34567",
    },
    {
        "slug": "hardeep-singh-gill",
        "email": "steward.gill@pithros.com",
        "name": "Maj. Gurpreet Singh Gill",
        "relationship": "Son",
        "phone": "+91 98140 45678",
    },
    {
        "slug": "arun-krishnan",
        "email": "steward.arun@pithros.com",
        "name": "Anita Krishnan",
        "relationship": "Spouse",
        "phone": "+91 98450 56789",
    },
    {
        "slug": "justice-ev-ramaswamy",
        "email": "steward.ramaswamy@pithros.com",
        "name": "R. Venkatasubramanian",
        "relationship": "Son & Senior Advocate",
        "phone": "+91 98400 67890",
    },
]


def run():
    password = os.getenv("PITHROS_STEWARD_PASSWORD")
    if not password:
        raise SystemExit(
            "Set PITHROS_STEWARD_PASSWORD before running — refusing to reuse a shared default."
        )
    if os.getenv("PITHROS_ALLOW_STEWARD_PROVISIONING") != "true":
        raise SystemExit(
            "Refusing to provision accounts. Set "
            "PITHROS_ALLOW_STEWARD_PROVISIONING=true to confirm."
        )

    print("=" * 65)
    print("PROVISIONING DEDICATED STEWARD ACCOUNTS IN FIREBASE & SUPABASE")
    print("=" * 65)

    verifier = get_firebase_verifier()
    verifier._ensure_app()
    db = SessionLocal()

    for item in STEWARDS:
        email = item["email"]
        name = item["name"]
        slug = item["slug"]
        print(f"\n-> Provisioning steward for '{slug}': {email}...")

        # 1. Firebase Auth
        try:
            fb_user = fb_auth.get_user_by_email(email)
            print(f"   Existing Firebase user found (UID: {fb_user.uid}). Updating...")
            fb_auth.update_user(
                fb_user.uid, password=password, display_name=name, email_verified=True
            )
        except fb_auth.UserNotFoundError:
            fb_user = fb_auth.create_user(
                email=email,
                password=password,
                display_name=name,
                email_verified=True,
            )
            print(f"   Created new Firebase user (UID: {fb_user.uid}).")

        # Set claims
        fb_auth.set_custom_user_claims(fb_user.uid, {"role": "family_steward"})

        # 2. Supabase User Record
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            user = User(
                id=uuid.uuid4(),
                firebase_uid=fb_user.uid,
                email=email,
                name=name,
                phone=item["phone"],
                role="family_steward",
                email_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"   Created Supabase User (ID: {user.id})")
        else:
            user.firebase_uid = fb_user.uid
            user.role = "family_steward"
            user.name = name
            user.phone = item["phone"]
            user.email_verified = True
            db.commit()

        # Billing Account
        b_acc = db.scalar(select(BillingAccount).where(BillingAccount.owner_user_id == user.id))
        if not b_acc:
            b_acc = BillingAccount(
                owner_user_id=user.id,
                billing_email=email,
                billing_name=name,
                country="IN",
                currency="INR",
            )
            db.add(b_acc)
            db.commit()

        # 3. Associate with Memorial
        memorial = db.scalar(select(Memorial).where(Memorial.slug == slug))
        if memorial:
            existing_steward = db.scalar(
                select(MemorialSteward).where(
                    MemorialSteward.memorial_id == memorial.id,
                    MemorialSteward.user_id == user.id,
                )
            )
            if not existing_steward:
                db.add(
                    MemorialSteward(
                        memorial_id=memorial.id,
                        user_id=user.id,
                        is_primary=False,
                    )
                )
                db.commit()
                print(f"   Linked {email} as steward for {memorial.full_name}!")
            else:
                print(f"   {email} is already linked as steward.")

    print("\n" + "=" * 65)
    print("ALL 5 INDIVIDUAL STEWARDS CREATED AND LINKED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    run()
