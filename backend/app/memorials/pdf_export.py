"""PDF Memorial Book generation using ReportLab.

Produces a reverent, beautifully typeset archival memorial book including:
- Cover & Frontispiece with details & embedded QR plaque
- Life Story & Chronicle (Overview, Early Life, Values, Enduring Legacy)
- Chronological Timeline Milestones
- Kinship, Family Constellation & Stewardship
- Condolences & Community Tributes
"""

from __future__ import annotations

import io
from typing import TYPE_CHECKING
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

if TYPE_CHECKING:
    from app.memorials.models import Memorial, MemorialContributor, Story, TimelineEvent
    from app.tributes.models import Tribute


def _esc(val: str | None) -> str:
    if not val:
        return ""
    return escape(str(val))


def generate_memorial_pdf(
    *,
    memorial: Memorial,
    story: Story | None,
    timeline_events: list[TimelineEvent],
    contributors: list[MemorialContributor],
    tributes: list[Tribute],
    qr_png_bytes: bytes | None = None,
) -> bytes:
    """Generate a publication-grade archival PDF memorial book in memory."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    base_styles = getSampleStyleSheet()

    # Custom reverent typography palette
    c_primary = colors.HexColor("#23324A")  # Deep Slate / Navy
    c_gold = colors.HexColor("#8C5C0F")  # Warm Pithros Archival Gold
    c_dark = colors.HexColor("#20242A")  # Soft Charcoal Body
    c_muted = colors.HexColor("#6B655B")  # Muted Subtext
    c_line = colors.HexColor("#D8CFC0")  # Border / Separator

    header_style = ParagraphStyle(
        "ArchivalHeader",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        alignment=1,  # Center
        textColor=c_gold,
        spaceAfter=12,
    )

    title_style = ParagraphStyle(
        "CoverTitle",
        parent=base_styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=30,
        alignment=1,
        textColor=c_primary,
        spaceAfter=8,
    )

    dates_style = ParagraphStyle(
        "CoverDates",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        alignment=1,
        textColor=c_gold,
        spaceAfter=16,
    )

    epitaph_style = ParagraphStyle(
        "CoverEpitaph",
        parent=base_styles["Italic"],
        fontName="Helvetica-Oblique",
        fontSize=11,
        leading=16,
        alignment=1,
        textColor=c_dark,
        spaceAfter=20,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=base_styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=10,
    )

    subheading_style = ParagraphStyle(
        "SubHeading",
        parent=base_styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=c_gold,
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=c_dark,
        spaceAfter=8,
    )

    quote_style = ParagraphStyle(
        "QuoteBlock",
        parent=base_styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9.5,
        leading=14,
        textColor=c_dark,
        leftIndent=18,
        rightIndent=18,
        spaceAfter=8,
    )

    meta_style = ParagraphStyle(
        "MetaMuted",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=c_muted,
        spaceAfter=4,
    )

    elements = []

    # ─── PAGE 1: COVER & FRONTISPIECE ──────────────────────────────────────────
    elements.append(Paragraph("PITHROS DIGITAL MEMORIAL ARCHIVE", header_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=c_line, spaceAfter=24))

    elements.append(Spacer(1, 20))
    elements.append(Paragraph(_esc(memorial.full_name), title_style))

    dates_text = ""
    if memorial.birth_date or memorial.death_date:
        dates_text = f"{memorial.birth_date} — {memorial.death_date}".strip(" —")
    if dates_text:
        elements.append(Paragraph(_esc(dates_text), dates_style))

    if memorial.birth_place or memorial.resting_place:
        location_parts = []
        if memorial.birth_place:
            location_parts.append(f"Born: {memorial.birth_place}")
        if memorial.resting_place:
            location_parts.append(f"Resting Place: {memorial.resting_place}")
        elements.append(Paragraph(_esc(" • ".join(location_parts)), meta_style))

    elements.append(Spacer(1, 16))

    if memorial.short_epitaph:
        elements.append(Paragraph(f"&ldquo;{_esc(memorial.short_epitaph)}&rdquo;", epitaph_style))

    elements.append(Spacer(1, 30))

    # Embedded QR Code
    if qr_png_bytes:
        qr_buf = io.BytesIO(qr_png_bytes)
        qr_buf.seek(0)
        elements.append(Image(qr_buf, width=120, height=120))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph("Scan to visit the permanent digital sanctuary", meta_style))

    elements.append(Spacer(1, 40))
    elements.append(
        Paragraph("Archived with permanence and reverent care • Pithros Remembrance", meta_style)
    )

    if story is not None:
        has_content = bool(
            story.overview
            or story.early_life
            or story.passions_and_values
            or story.enduring_legacy
            or story.favorite_quotes
        )
        if has_content:
            elements.append(PageBreak())
            elements.append(Paragraph("Life Story & Chronicle", section_heading))
            elements.append(HRFlowable(width="100%", thickness=0.5, color=c_line, spaceAfter=14))

            if story.overview:
                elements.append(Paragraph("Overview", subheading_style))
                elements.append(Paragraph(_esc(story.overview), body_style))

            if story.early_life:
                elements.append(Paragraph("Early Life & Roots", subheading_style))
                elements.append(Paragraph(_esc(story.early_life), body_style))

            if story.passions_and_values:
                elements.append(Paragraph("Passions, Values & Life's Dedication", subheading_style))
                elements.append(Paragraph(_esc(story.passions_and_values), body_style))

            if story.enduring_legacy:
                elements.append(Paragraph("Enduring Legacy", subheading_style))
                elements.append(Paragraph(_esc(story.enduring_legacy), body_style))

            if story.favorite_quotes:
                elements.append(Paragraph("Words to Remember", subheading_style))
                for q in story.favorite_quotes:
                    elements.append(Paragraph(f"&ldquo;{_esc(q)}&rdquo;", quote_style))

    # ─── PAGE 3: TIMELINE MILESTONES ────────────────────────────────────────────
    if timeline_events:
        elements.append(PageBreak())
        elements.append(Paragraph("Chronological Milestones", section_heading))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=c_line, spaceAfter=14))

        for event in timeline_events:
            block = []
            heading_parts = []
            if event.year:
                heading_parts.append(event.year)
            if event.date_str:
                heading_parts.append(event.date_str)
            time_label = " • ".join(heading_parts) or "Milestone"

            block.append(
                Paragraph(f"<b>{_esc(time_label)}</b> — {_esc(event.title)}", subheading_style)
            )
            if event.description:
                block.append(Paragraph(_esc(event.description), body_style))
            block.append(Spacer(1, 6))
            elements.append(KeepTogether(block))

    # ─── PAGE 4: KINSHIP & CONDOLENCES ──────────────────────────────────────────
    has_contributors = bool(contributors)
    has_tributes = bool(tributes)

    if has_contributors or has_tributes:
        elements.append(PageBreak())
        elements.append(Paragraph("Kinship & Condolence Tributes", section_heading))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=c_line, spaceAfter=14))

        if has_contributors:
            elements.append(Paragraph("Family Constellation & Stewards", subheading_style))
            for c in contributors:
                name = c.display_name or c.invited_email or "Family Contributor"
                rel = c.relationship_label or c.role.capitalize()
                elements.append(Paragraph(f"• <b>{_esc(name)}</b> ({_esc(rel)})", body_style))
            elements.append(Spacer(1, 12))

        if has_tributes:
            elements.append(Paragraph("Condolences & Memories", subheading_style))
            for t in tributes:
                block = []
                rel_str = f" ({_esc(t.relationship)})" if t.relationship else ""
                block.append(
                    Paragraph(
                        f"<b>{_esc(t.author_name)}</b>{rel_str}:",
                        ParagraphStyle(
                            "TributeAuthor",
                            parent=body_style,
                            fontName="Helvetica-Bold",
                            textColor=c_primary,
                        ),
                    )
                )
                block.append(Paragraph(f"&ldquo;{_esc(t.message)}&rdquo;", quote_style))
                block.append(Spacer(1, 6))
                elements.append(KeepTogether(block))

    doc.build(elements)
    return buf.getvalue()
