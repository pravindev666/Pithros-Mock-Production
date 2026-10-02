"""Consistency checker: compare OCR extractions with memorial fields.

Fuzzy matching rather than exact equality, because:

* Indian municipal documents regularly transliterate names differently
  ("PRAVIN" vs "Praveen", "SHARMA" vs "Sarma").
* Date formats vary wildly across states and issuing bodies.
* OCR itself introduces noise — a "1" read as "l" is expected, not exceptional.

The output is a risk assessment that a human reviewer reads alongside the
original document.  It never makes a decision on its own.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from difflib import SequenceMatcher

from app.verification.ocr import ExtractionResult

# ─── Thresholds ─────────────────────────────────────────────────────────────

NAME_EXACT_THRESHOLD = 0.90
NAME_LIKELY_THRESHOLD = 0.65
NAME_MISMATCH_THRESHOLD = 0.40


# ─── Helpers ────────────────────────────────────────────────────────────────


def _normalise_name(name: str) -> str:
    """Lower-case, strip punctuation, sort tokens alphabetically.

    Sorting makes "Kumar Pravin" match "Pravin Kumar" regardless of order.
    """
    tokens = re.sub(r"[^a-zA-Z\s]", "", name.lower()).split()
    return " ".join(sorted(tokens))


def _name_similarity(a: str, b: str) -> float:
    """Token-sorted fuzzy ratio between two names."""
    na, nb = _normalise_name(a), _normalise_name(b)
    if not na or not nb:
        return 0.0
    return SequenceMatcher(None, na, nb).ratio()


def _parse_memorial_date(date_str: str) -> str | None:
    """Best-effort parse of the memorial's stored date string to YYYY-MM-DD.

    Memorial dates are stored as freeform strings (e.g. "15 March 2026",
    "2026-03-15", "March 15, 2026").  We try several formats.
    """
    if not date_str or not date_str.strip():
        return None

    cleaned = date_str.strip()

    # Already ISO
    if re.match(r"^\d{4}-\d{2}-\d{2}$", cleaned):
        return cleaned

    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%d %B %Y",
        "%B %d, %Y",
        "%B %d %Y",
        "%d %b %Y",
        "%b %d, %Y",
        "%b %d %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Last resort: extract any date-looking substring.
    m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", cleaned)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"

    return None


# ─── Result types ───────────────────────────────────────────────────────────


@dataclass
class MatchResult:
    score: float
    memorial_value: str
    document_value: str
    verdict: str  # "exact_match" | "likely_match" | "weak_match" | "mismatch" | "not_found"


@dataclass
class ConsistencyReport:
    """What the human reviewer sees alongside the document."""

    name_match: MatchResult | None = None
    date_match: MatchResult | None = None
    document_type_confidence: str = "unknown"  # "high" | "medium" | "low" | "unknown"
    flags: list[str] = field(default_factory=list)
    overall_risk: str = "unknown"  # "low" | "medium" | "high" | "unknown"

    def to_dict(self) -> dict:
        result: dict = {
            "document_type_confidence": self.document_type_confidence,
            "flags": self.flags,
            "overall_risk": self.overall_risk,
        }
        if self.name_match is not None:
            result["name_match"] = {
                "score": round(self.name_match.score, 2),
                "memorial": self.name_match.memorial_value,
                "document": self.name_match.document_value,
                "verdict": self.name_match.verdict,
            }
        if self.date_match is not None:
            result["date_match"] = {
                "score": round(self.date_match.score, 2),
                "memorial": self.date_match.memorial_value,
                "document": self.date_match.document_value,
                "verdict": self.date_match.verdict,
            }
        return result


# ─── Core checker ───────────────────────────────────────────────────────────


def check_consistency(
    extraction: ExtractionResult,
    *,
    memorial_full_name: str,
    memorial_death_date: str,
) -> ConsistencyReport:
    """Compare OCR output with what the family entered on the memorial."""

    report = ConsistencyReport()
    flags: list[str] = []

    # ── Text presence ───────────────────────────────────────────────────

    if not extraction.text.strip():
        flags.append("no_text_extracted")
        report.flags = flags
        report.overall_risk = "high"
        report.document_type_confidence = "unknown"
        return report

    if extraction.text_length < 50:
        flags.append("suspiciously_short")

    # ── Document type confidence ────────────────────────────────────────

    keywords = extraction.keywords_found
    if any(
        kw in keywords
        for kw in [
            "death certificate",
            "certificate of death",
            "death registration",
        ]
    ):
        report.document_type_confidence = "high"
    elif any(
        kw in keywords
        for kw in [
            "cremation",
            "burial",
            "funeral",
            "obituary",
            "deceased",
        ]
    ):
        report.document_type_confidence = "medium"
    elif keywords:
        report.document_type_confidence = "low"
    else:
        report.document_type_confidence = "unknown"
        flags.append("no_death_keywords")

    # ── Name matching ───────────────────────────────────────────────────

    if extraction.names_found and memorial_full_name:
        best_score = 0.0
        best_doc_name = ""
        for doc_name in extraction.names_found:
            score = _name_similarity(memorial_full_name, doc_name)
            if score > best_score:
                best_score = score
                best_doc_name = doc_name

        if best_score >= NAME_EXACT_THRESHOLD:
            verdict = "exact_match"
        elif best_score >= NAME_LIKELY_THRESHOLD:
            verdict = "likely_match"
        elif best_score >= NAME_MISMATCH_THRESHOLD:
            verdict = "weak_match"
        else:
            verdict = "mismatch"
            flags.append("name_mismatch")

        report.name_match = MatchResult(
            score=best_score,
            memorial_value=memorial_full_name,
            document_value=best_doc_name,
            verdict=verdict,
        )
    elif not extraction.names_found:
        report.name_match = MatchResult(
            score=0.0,
            memorial_value=memorial_full_name,
            document_value="",
            verdict="not_found",
        )

    # ── Date matching ───────────────────────────────────────────────────

    memorial_iso = _parse_memorial_date(memorial_death_date)

    if extraction.dates_found and memorial_iso:
        if memorial_iso in extraction.dates_found:
            report.date_match = MatchResult(
                score=1.0,
                memorial_value=memorial_iso,
                document_value=memorial_iso,
                verdict="exact_match",
            )
        else:
            # No exact match.  Pick the closest date for the report.
            report.date_match = MatchResult(
                score=0.0,
                memorial_value=memorial_iso,
                document_value=", ".join(extraction.dates_found[:3]),
                verdict="mismatch",
            )
            flags.append("date_mismatch")
    elif not extraction.dates_found:
        flags.append("no_dates_found")
        if memorial_iso:
            report.date_match = MatchResult(
                score=0.0,
                memorial_value=memorial_iso,
                document_value="",
                verdict="not_found",
            )

    # ── Overall risk ────────────────────────────────────────────────────

    risk_score = 0
    if "no_text_extracted" in flags:
        risk_score += 3
    if "name_mismatch" in flags:
        risk_score += 2
    if "date_mismatch" in flags:
        risk_score += 2
    if "no_death_keywords" in flags:
        risk_score += 1
    if "no_dates_found" in flags:
        risk_score += 1
    if "suspiciously_short" in flags:
        risk_score += 1

    if risk_score == 0:
        report.overall_risk = "low"
    elif risk_score <= 2:
        report.overall_risk = "medium"
    else:
        report.overall_risk = "high"

    report.flags = flags
    return report
