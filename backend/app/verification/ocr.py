"""Text extraction from verification evidence.

Two paths depending on the document format:

* **PDF** — `pypdf` extracts embedded text first (most digitally-issued
  certificates already carry it).  If that yields nothing, each page is
  rasterised to an image and passed through Tesseract.
* **Image** — Pillow opens the file, Tesseract reads the pixels.

Neither path is trusted on its own.  The result is a bag of text that the
consistency checker compares against memorial fields; it is never shown to the
public and never presented as a legal conclusion.
"""

from __future__ import annotations

import logging
import os
import re
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from io import BytesIO

from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Tesseract availability ─────────────────────────────────────────────────

_TESSERACT_AVAILABLE: bool | None = None


def _check_tesseract() -> bool:
    """Lazy one-shot probe: is the tesseract binary reachable?"""
    global _TESSERACT_AVAILABLE
    if _TESSERACT_AVAILABLE is not None:
        return _TESSERACT_AVAILABLE

    # Ensure TESSDATA_PREFIX is configured if not already set in environment
    if "TESSDATA_PREFIX" not in os.environ:
        candidates = [
            getattr(settings, "tessdata_prefix", None),
            os.path.expanduser(r"~\scoop\apps\tesseract-languages\current"),
            os.path.expanduser(r"~\scoop\apps\tesseract\current\tessdata"),
            r"C:\Program Files\Tesseract-OCR\tessdata",
            "/usr/share/tesseract-ocr/4.00/tessdata",
            "/usr/share/tesseract-ocr/5/tessdata",
            "/usr/share/tessdata",
        ]
        for candidate in candidates:
            if candidate and os.path.isdir(candidate):
                os.environ["TESSDATA_PREFIX"] = candidate
                break

    cmd = getattr(settings, "tesseract_cmd", None) or shutil.which("tesseract")
    if cmd is None:
        logger.warning("tesseract_not_found: OCR will be unavailable")
        _TESSERACT_AVAILABLE = False
        return False

    try:
        import pytesseract

        pytesseract.pytesseract.tesseract_cmd = cmd
        # Quick smoke test — fails fast if the binary is broken.
        pytesseract.get_tesseract_version()
        _TESSERACT_AVAILABLE = True
        logger.info("tesseract_ready", extra={"cmd": cmd})
    except Exception:
        logger.warning("tesseract_init_failed", exc_info=True)
        _TESSERACT_AVAILABLE = False

    return _TESSERACT_AVAILABLE


# ─── Date extraction ────────────────────────────────────────────────────────

# Covers DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (and reversed YYYY variants).
_DATE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b"), "dmy"),
    (re.compile(r"\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b"), "ymd"),
]

# Month-name dates: "March 15, 2026" or "15 March 2026".
_MONTH_NAMES = (
    "january|february|march|april|may|june|july|august|september|october|november|december"
)
_MONTH_NAME_DMY = re.compile(rf"\b(\d{{1,2}})\s+({_MONTH_NAMES})\s+(\d{{4}})\b", re.IGNORECASE)
_MONTH_NAME_MDY = re.compile(rf"\b({_MONTH_NAMES})\s+(\d{{1,2}}),?\s+(\d{{4}})\b", re.IGNORECASE)

_MONTH_MAP = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


def _parse_dates(text: str) -> list[str]:
    """Return all dates found as ISO-format strings (YYYY-MM-DD)."""
    found: set[str] = set()

    for pattern, order in _DATE_PATTERNS:
        for match in pattern.finditer(text):
            try:
                a, b, c = int(match.group(1)), int(match.group(2)), int(match.group(3))
                if order == "dmy":
                    day, month, year = a, b, c
                else:
                    year, month, day = a, b, c
                dt = datetime(year, month, day)
                found.add(dt.strftime("%Y-%m-%d"))
            except (ValueError, OverflowError):
                continue

    for match in _MONTH_NAME_DMY.finditer(text):
        try:
            day = int(match.group(1))
            month = _MONTH_MAP[match.group(2).lower()]
            year = int(match.group(3))
            found.add(datetime(year, month, day).strftime("%Y-%m-%d"))
        except (ValueError, KeyError):
            continue

    for match in _MONTH_NAME_MDY.finditer(text):
        try:
            month = _MONTH_MAP[match.group(1).lower()]
            day = int(match.group(2))
            year = int(match.group(3))
            found.add(datetime(year, month, day).strftime("%Y-%m-%d"))
        except (ValueError, KeyError):
            continue

    return sorted(found)


# ─── Name extraction ────────────────────────────────────────────────────────

# Explicitly labeled name fields common on death/cremation certificates.
_LABELED_NAME_PATTERN = re.compile(
    r"(?:Name\s+(?:of\s+)?(?:the\s+)?(?:Deceased|Person)|Deceased(?:\s+Name)?|Late)"
    r"\s*[:\-]\s*([A-Za-z' \t]{2,60})",
    re.IGNORECASE,
)

# A general name candidate: 2 to 4 capitalized words on the SAME line (no newlines).
_CAP_PHRASE = re.compile(r"\b([A-Z][A-Za-z']+(?:[ \t]+[A-Z][A-Za-z']+){1,3})\b")

# Common document words that look like names or prefixes/suffixes but aren't.
_NON_NAME_WORDS = {
    "death",
    "certificate",
    "municipal",
    "corporation",
    "registrar",
    "registration",
    "cremation",
    "burial",
    "funeral",
    "obituary",
    "issued",
    "cause",
    "date",
    "place",
    "natural",
    "causes",
    "certified",
    "copy",
    "office",
    "district",
    "state",
    "government",
    "hospital",
    "medical",
    "officer",
    "health",
    "department",
    "deceased",
    "decedent",
    "person",
    "name",
    "gender",
    "sex",
    "age",
    "male",
    "female",
    "years",
    "year",
    "father",
    "mother",
    "husband",
    "wife",
    "spouse",
    "address",
    "residence",
    "permanent",
    "signature",
    "seal",
    "stamp",
    "authority",
    "dr",
    "doctor",
    "no",
    "number",
}


def _clean_name_candidate(raw: str) -> str | None:
    """Trim non-name words from edges and validate candidate."""
    tokens = raw.strip().split()
    # Strip leading / trailing non-name tokens (e.g. "Date", "Cause", "Dr.")
    while tokens and tokens[0].lower().strip(".:,;-'\"") in _NON_NAME_WORDS:
        tokens.pop(0)
    while tokens and tokens[-1].lower().strip(".:,;-'\"") in _NON_NAME_WORDS:
        tokens.pop()

    if len(tokens) < 2 or len(tokens) > 5:
        return None

    non_name_count = sum(1 for t in tokens if t.lower().strip(".:,;-'\"") in _NON_NAME_WORDS)
    if non_name_count > len(tokens) / 3:
        return None

    cleaned = " ".join(tokens)
    return cleaned if len(cleaned) >= 4 else None


def _extract_names(text: str) -> list[str]:
    """Return candidate person names, highest confidence first."""
    unique: list[str] = []
    seen: set[str] = set()

    # 1. First priority: explicitly labeled deceased names (e.g. "Name of Deceased: ...")
    for match in _LABELED_NAME_PATTERN.finditer(text):
        cleaned = _clean_name_candidate(match.group(1))
        if cleaned:
            key = cleaned.upper()
            if key not in seen:
                seen.add(key)
                unique.append(cleaned)

    # 2. Second priority: capitalized multi-word phrases on single lines
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        for match in _CAP_PHRASE.finditer(line):
            cleaned = _clean_name_candidate(match.group(1))
            if cleaned:
                key = cleaned.upper()
                if key not in seen:
                    seen.add(key)
                    unique.append(cleaned)

    unique.sort(key=len, reverse=True)
    return unique[:10]


# ─── Keyword / registration detection ───────────────────────────────────────

_DOCUMENT_KEYWORDS = [
    "death certificate",
    "certificate of death",
    "death registration",
    "cremation",
    "burial",
    "cremation certificate",
    "funeral",
    "funeral notice",
    "funeral home",
    "obituary",
    "certificate",
    "municipal",
    "registrar",
    "cause of death",
    "date of death",
    "place of death",
    "deceased",
    "decedent",
]

# Registration pattern: requires word boundary, registration/cert/no keyword,
# and captures an alphanumeric code that MUST contain at least one digit.
_REGISTRATION_PATTERN = re.compile(
    r"\b(?:Reg(?:istration)?|Certificate|Cert|Record|Ref(?:erence)?)\s*"
    r"(?:No|Number|#|ID)?\.?\s*[:\-]?\s*"
    r"([A-Z0-9][A-Z0-9\-/]{3,30})",
    re.IGNORECASE,
)
_STANDALONE_ID = re.compile(r"\b([A-Z]{2,}[\-/][A-Z0-9\-/]{3,25})\b")


def _find_keywords(text: str) -> list[str]:
    lower = text.lower()
    return [kw for kw in _DOCUMENT_KEYWORDS if kw in lower]


def _find_registration_numbers(text: str) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()

    def _is_valid_reg(val: str) -> bool:
        val = val.strip().strip(".-/ ")
        if len(val) < 4:
            return False
        # A registration number MUST contain at least one digit
        if not any(c.isdigit() for c in val):
            return False
        # Avoid matching pure dates like 15/03/2026 or 2026-03-15
        return not re.match(r"^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$", val)

    for match in _REGISTRATION_PATTERN.finditer(text):
        candidate = match.group(1).strip()
        if _is_valid_reg(candidate) and candidate.upper() not in seen:
            seen.add(candidate.upper())
            found.append(candidate)

    for match in _STANDALONE_ID.finditer(text):
        candidate = match.group(1).strip()
        if _is_valid_reg(candidate) and candidate.upper() not in seen:
            seen.add(candidate.upper())
            found.append(candidate)

    return found[:5]


# ─── Extraction result ──────────────────────────────────────────────────────


@dataclass
class ExtractionResult:
    """Everything OCR pulled out of a single evidence document."""

    text: str = ""
    text_length: int = 0
    dates_found: list[str] = field(default_factory=list)
    names_found: list[str] = field(default_factory=list)
    keywords_found: list[str] = field(default_factory=list)
    registration_numbers: list[str] = field(default_factory=list)
    ocr_engine: str = ""
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "ocr_engine": self.ocr_engine,
            "text_extracted": bool(self.text.strip()),
            "text_length": self.text_length,
            "document_keywords_found": self.keywords_found,
            "registration_numbers": self.registration_numbers,
            "dates_found": self.dates_found,
            "names_found": self.names_found,
            "raw_text_preview": self.text[:500] if self.text else "",
            "error": self.error,
        }


def _analyse_text(raw: str, engine: str) -> ExtractionResult:
    """Build an ExtractionResult from raw OCR / embedded text."""
    text = raw.strip()
    return ExtractionResult(
        text=text,
        text_length=len(text),
        dates_found=_parse_dates(text),
        names_found=_extract_names(text),
        keywords_found=_find_keywords(text),
        registration_numbers=_find_registration_numbers(text),
        ocr_engine=engine,
    )


# ─── Public API ─────────────────────────────────────────────────────────────


def extract_text_from_image(data: bytes) -> ExtractionResult:
    """Run Tesseract on raw image bytes."""
    if not _check_tesseract():
        return ExtractionResult(
            ocr_engine="unavailable",
            error="Tesseract is not installed or not reachable.",
        )

    try:
        import pytesseract

        image: Image.Image = Image.open(BytesIO(data))
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

        raw = pytesseract.image_to_string(image, lang="eng")
        return _analyse_text(raw, f"tesseract-{pytesseract.get_tesseract_version()}")
    except Exception as exc:
        logger.exception("ocr_image_failed")
        return ExtractionResult(ocr_engine="tesseract", error=str(exc)[:500])


def extract_text_from_pdf(data: bytes) -> ExtractionResult:
    """Extract text from a PDF: try embedded text first, fall back to OCR."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(data))
        pages_text: list[str] = []
        for page in reader.pages:
            text = page.extract_text() or ""
            pages_text.append(text)

        embedded = "\n".join(pages_text).strip()

        # If the PDF has enough embedded text, no need for OCR.
        if len(embedded) > 50:
            return _analyse_text(embedded, "pypdf-embedded")

        # Fall back to OCR: rasterise each page and run Tesseract.
        if not _check_tesseract():
            # Return whatever little text pypdf found.
            return _analyse_text(embedded, "pypdf-embedded-sparse")

        import pytesseract

        ocr_parts: list[str] = []
        for page in reader.pages:
            # pypdf cannot rasterise directly.  If there are embedded images,
            # extract the first one per page (covers scanned certificates).
            for image_obj in page.images:
                try:
                    img: Image.Image = Image.open(BytesIO(image_obj.data))
                    if img.mode not in ("RGB", "L"):
                        img = img.convert("RGB")
                    ocr_parts.append(pytesseract.image_to_string(img, lang="eng"))
                except Exception:
                    logger.debug("pdf_page_image_ocr_failed", exc_info=True)
                    continue

        all_text = (embedded + "\n" + "\n".join(ocr_parts)).strip()
        engine = f"pypdf+tesseract-{pytesseract.get_tesseract_version()}"
        return _analyse_text(all_text, engine)

    except Exception as exc:
        logger.exception("ocr_pdf_failed")
        return ExtractionResult(ocr_engine="pypdf", error=str(exc)[:500])


def extract_text(data: bytes, mime_type: str) -> ExtractionResult:
    """Dispatch to the right extractor based on MIME type."""
    if mime_type == "application/pdf":
        return extract_text_from_pdf(data)
    if mime_type.startswith("image/"):
        return extract_text_from_image(data)
    return ExtractionResult(
        ocr_engine="none",
        error=f"Unsupported MIME type for OCR: {mime_type}",
    )
