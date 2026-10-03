"""Tests for the AI-assisted verification pipeline (OCR + Consistency Checker + Celery task).

Verifies that:
1. Tesseract OCR correctly extracts text, dates, person names, keywords, and
   registration numbers from documents.
2. Edge cases like non-name words and backtrack-prone registration patterns are
   handled cleanly.
3. The consistency checker calculates accurate match scores and risk signals
   without making automated legal decisions.
4. The prepare_verification worker task runs end-to-end and advances
   submissions to VERIFICATION_REVIEW.
5. Missing or corrupted media does not block the review queue.
6. Admin review API endpoints expose the automated analysis and risk signals.
"""

from __future__ import annotations

import uuid
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont

from app.core.enums import AdminSubRole, MediaKind, MediaStatus, StorageTier, VerificationState
from app.media.models import MediaItem
from app.media.storage import get_storage
from app.verification.consistency import check_consistency
from app.verification.models import VerificationEvidence, VerificationSubmission
from app.verification.ocr import (
    ExtractionResult,
    _clean_name_candidate,
    _extract_names,
    _find_registration_numbers,
    _parse_dates,
    extract_text_from_image,
)
from app.verification.tasks import prepare_verification


def _make_certificate_image(
    *,
    title: str = "DEATH CERTIFICATE",
    name: str = "PRAVIN KUMAR SHARMA",
    date_of_death: str = "15/03/2026",
    registration_no: str = "MUNIC-BLR-2026-08129",
) -> bytes:
    """Generate a clean synthetic death certificate PNG image."""
    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("arial.ttf", 22)
        font_large = ImageFont.truetype("arial.ttf", 26)
    except OSError:
        # Linux CI has no arial.ttf. A fixed-size bitmap default renders the digits
        # too small for Tesseract (observed: 2026 read as 2028); the size-aware
        # default keeps the glyphs large enough to be read correctly everywhere.
        font = ImageFont.load_default(size=22)
        font_large = ImageFont.load_default(size=26)

    draw.text((220, 40), title, fill=(0, 0, 0), font=font_large)
    draw.text((60, 110), "Municipal Corporation of Bangalore", fill=(0, 0, 0), font=font)
    draw.text((60, 160), f"Registration No. {registration_no}", fill=(0, 0, 0), font=font)
    draw.text((60, 220), f"Name of Deceased: {name}", fill=(0, 0, 0), font=font)
    draw.text((60, 270), f"Date of Death: {date_of_death}", fill=(0, 0, 0), font=font)
    draw.text((60, 320), "Cause of Death: Natural Causes", fill=(0, 0, 0), font=font)
    draw.text((60, 370), "Date of Registration: 18/03/2026", fill=(0, 0, 0), font=font)
    draw.text((60, 430), "Cremation Certificate Issued", fill=(0, 0, 0), font=font)
    draw.text((60, 490), "Registrar: Dr. S. Ramesh", fill=(0, 0, 0), font=font)

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ─── Unit tests: OCR module ──────────────────────────────────────────────────


def test_ocr_extract_text_from_image_synthetic():
    image_bytes = _make_certificate_image()
    result = extract_text_from_image(image_bytes)

    assert result.error is None
    assert result.ocr_engine.startswith("tesseract")
    assert result.text_length > 100
    assert "death certificate" in result.keywords_found
    assert "2026-03-15" in result.dates_found
    assert "PRAVIN KUMAR SHARMA" in result.names_found
    assert "MUNIC-BLR-2026-08129" in result.registration_numbers
    # Must NOT have false positives
    assert "istration" not in result.registration_numbers
    assert "istrar" not in result.registration_numbers


def test_ocr_name_candidate_filtering():
    assert _clean_name_candidate("PRAVIN KUMAR SHARMA Date") == "PRAVIN KUMAR SHARMA"
    assert _clean_name_candidate("Cause of Death") is None
    assert _clean_name_candidate("Municipal Corporation") is None
    assert _clean_name_candidate("Dr. Anita Roy") == "Anita Roy"
    assert _clean_name_candidate("Single") is None


def test_ocr_extract_names_labeled_and_phrases():
    text = (
        "MUNICIPAL CORPORATION\n"
        "Name of Deceased: RAMESH CHANDRA GUPTA\n"
        "Date of Death: 10/01/2026\n"
        "Doctor: Dr. V. Sharma\n"
    )
    names = _extract_names(text)
    assert "RAMESH CHANDRA GUPTA" in names
    # Common document headers must not be recognized as names
    assert "MUNICIPAL CORPORATION" not in names


def test_ocr_registration_number_validation():
    text = (
        "Registration No. DEL-2026-88124\n"
        "Date of Registration: 18/03/2026\n"
        "Registrar: Dr. Ramesh\n"
        "Cert No: CERT/9901/A\n"
    )
    regs = _find_registration_numbers(text)
    assert "DEL-2026-88124" in regs
    assert "CERT/9901/A" in regs
    assert "istration" not in regs
    assert "istrar" not in regs


def test_ocr_date_parsing_various_formats():
    text = "Died on 15/03/2026, registered 2026-03-18 and recorded on 25 December 2025."
    dates = _parse_dates(text)
    assert "2026-03-15" in dates
    assert "2026-03-18" in dates
    assert "2025-12-25" in dates


# ─── Unit tests: Consistency checker ─────────────────────────────────────────


def test_consistency_exact_match():
    extraction = ExtractionResult(
        text="Sample Death Certificate text for Pravin Kumar Sharma...",
        text_length=150,
        dates_found=["2026-03-15", "2026-03-18"],
        names_found=["PRAVIN KUMAR SHARMA"],
        keywords_found=["death certificate", "cremation"],
        registration_numbers=["MUNIC-BLR-2026-08129"],
        ocr_engine="tesseract-5",
    )
    report = check_consistency(
        extraction,
        memorial_full_name="Pravin Kumar",
        memorial_death_date="2026-03-15",
    )
    assert report.overall_risk == "low"
    assert report.document_type_confidence == "high"
    assert report.date_match.verdict == "exact_match"
    assert report.date_match.score == 1.0
    assert report.name_match.verdict in ("likely_match", "exact_match")
    assert report.flags == []


def test_consistency_name_and_date_mismatch():
    extraction = ExtractionResult(
        text="Death certificate for John Doe who died on 2020-01-01...",
        text_length=120,
        dates_found=["2020-01-01"],
        names_found=["John Doe"],
        keywords_found=["death certificate"],
        registration_numbers=["REG-101"],
        ocr_engine="tesseract-5",
    )
    report = check_consistency(
        extraction,
        memorial_full_name="Pravin Kumar",
        memorial_death_date="2026-03-15",
    )
    assert report.overall_risk == "high"
    assert "name_mismatch" in report.flags
    assert "date_mismatch" in report.flags
    assert report.date_match.verdict == "mismatch"
    assert report.name_match.verdict == "mismatch"


def test_consistency_no_text_extracted():
    extraction = ExtractionResult(text="", text_length=0)
    report = check_consistency(
        extraction,
        memorial_full_name="Pravin Kumar",
        memorial_death_date="2026-03-15",
    )
    assert report.overall_risk == "high"
    assert "no_text_extracted" in report.flags


# ─── Integration tests: prepare_verification Celery task ─────────────────────


class _TestSessionContext:
    def __init__(self, session):
        self.session = session

    def __enter__(self):
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass


def test_prepare_verification_task_e2e(make_user, make_memorial, db_session, monkeypatch):
    monkeypatch.setattr(
        "app.verification.tasks.SessionLocal", lambda: _TestSessionContext(db_session)
    )
    owner = make_user(name="Owner")
    memorial = make_memorial(
        steward=owner,
        full_name="Pravin Kumar Sharma",
    )
    memorial.death_date = "2026-03-15"
    db_session.commit()

    # Upload synthetic certificate to sensitive storage
    image_bytes = _make_certificate_image(
        name="PRAVIN KUMAR SHARMA",
        date_of_death="15/03/2026",
    )
    storage = get_storage()
    storage_key = f"memorials/{memorial.id}/document/{uuid.uuid4().hex}.png"
    storage.put_bytes(
        tier=StorageTier.SENSITIVE,
        key=storage_key,
        data=image_bytes,
        content_type="image/png",
    )

    media = MediaItem(
        memorial_id=memorial.id,
        kind=MediaKind.DOCUMENT.value,
        status=MediaStatus.READY.value,
        privacy="private",
        storage_tier=StorageTier.SENSITIVE.value,
        storage_bucket="pithros-sensitive",
        storage_key=storage_key,
        original_filename="death_cert.png",
        mime_type="image/png",
        size_bytes=len(image_bytes),
        uploaded_by_id=owner.id,
    )
    db_session.add(media)
    db_session.commit()

    submission = VerificationSubmission(
        memorial_id=memorial.id,
        state=VerificationState.SUBMITTED.value,
        submitted_by_id=owner.id,
    )
    db_session.add(submission)
    db_session.flush()

    evidence = VerificationEvidence(
        submission_id=submission.id,
        media_id=media.id,
        document_type="death_certificate",
    )
    db_session.add(evidence)
    db_session.commit()

    # Run the worker task
    result = prepare_verification(str(submission.id))
    assert result["status"] == VerificationState.VERIFICATION_REVIEW.value

    # Verify database state
    db_session.expire_all()
    refreshed = db_session.get(VerificationSubmission, submission.id)
    assert refreshed.state == VerificationState.VERIFICATION_REVIEW.value
    assert refreshed.automated_result is not None
    assert refreshed.automated_result["text_extracted"] is True
    assert "PRAVIN KUMAR SHARMA" in refreshed.automated_result["names_found"]
    assert "2026-03-15" in refreshed.automated_result["dates_found"]
    assert refreshed.risk_signals is not None
    assert refreshed.risk_signals["overall_risk"] == "low"
    assert refreshed.risk_signals["document_type_confidence"] == "high"


def test_prepare_verification_resilience_on_missing_media(
    make_user, make_memorial, db_session, monkeypatch
):
    monkeypatch.setattr(
        "app.verification.tasks.SessionLocal", lambda: _TestSessionContext(db_session)
    )
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner)

    # Attach evidence pointing to a MediaItem with missing storage object
    media = MediaItem(
        memorial_id=memorial.id,
        kind=MediaKind.DOCUMENT.value,
        status=MediaStatus.READY.value,
        privacy="private",
        storage_tier=StorageTier.SENSITIVE.value,
        storage_bucket="pithros-sensitive",
        storage_key=f"memorials/{memorial.id}/document/does_not_exist.png",
        original_filename="missing.png",
        mime_type="image/png",
        size_bytes=100,
        uploaded_by_id=owner.id,
    )
    db_session.add(media)
    db_session.commit()

    submission = VerificationSubmission(
        memorial_id=memorial.id,
        state=VerificationState.SUBMITTED.value,
        submitted_by_id=owner.id,
    )
    db_session.add(submission)
    db_session.flush()

    evidence = VerificationEvidence(
        submission_id=submission.id,
        media_id=media.id,
        document_type="death_certificate",
    )
    db_session.add(evidence)
    db_session.commit()

    # The task must NEVER crash or block the queue
    result = prepare_verification(str(submission.id))
    assert result["status"] == VerificationState.VERIFICATION_REVIEW.value

    db_session.expire_all()
    refreshed = db_session.get(VerificationSubmission, submission.id)
    assert refreshed.state == VerificationState.VERIFICATION_REVIEW.value
    assert refreshed.automated_result is not None
    assert refreshed.automated_result["errors"] is not None


# ─── API tests: Admin reviewer endpoints ─────────────────────────────────────


def test_admin_get_submission_detail_and_queue(client, make_user, make_memorial, auth, db_session):
    owner = make_user(name="Owner")
    memorial = make_memorial(steward=owner, full_name="Anita Roy")

    submission = VerificationSubmission(
        memorial_id=memorial.id,
        state=VerificationState.VERIFICATION_REVIEW.value,
        submitted_by_id=owner.id,
        automated_result={"ocr_engine": "tesseract-5", "text_extracted": True},
        risk_signals={"overall_risk": "low", "document_type_confidence": "high"},
    )
    db_session.add(submission)
    db_session.commit()

    reviewer = make_user(name="Reviewer", role="admin")
    reviewer.admin_subrole = AdminSubRole.VERIFICATION_REVIEWER.value
    db_session.commit()

    # Test GET queue
    queue_resp = client.get(
        "/api/v1/admin/verification",
        headers=auth(reviewer),
    )
    assert queue_resp.status_code == 200
    items = queue_resp.json()
    assert any(i["id"] == str(submission.id) for i in items)
    matched_item = next(i for i in items if i["id"] == str(submission.id))
    assert matched_item["overallRisk"] == "low"
    assert matched_item["documentConfidence"] == "high"

    # Test GET single submission detail
    detail_resp = client.get(
        f"/api/v1/admin/verification/{submission.id}",
        headers=auth(reviewer),
    )
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == str(submission.id)
    assert detail["automatedResult"]["ocr_engine"] == "tesseract-5"
    assert detail["riskSignals"]["overall_risk"] == "low"
    assert detail["riskSignals"]["document_type_confidence"] == "high"
