"""Deterministic synthetic assets.

Nothing here depicts a real person: portraits are abstract compositions, audio
is a generated tone, and the certificates are documents carrying the memorial's
own synthetic data (with a deliberately mismatched variant for consistency
checks).
"""

from __future__ import annotations

import math
import struct
import wave
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas as pdf_canvas


@dataclass(frozen=True)
class AssetSet:
    portrait: Path
    photos: list[Path]
    voice: Path
    certificate_match: Path
    certificate_mismatch: Path
    obituary: Path
    blank_image: Path
    landscape_image: Path
    text_note: Path


def _gradient(
    width: int, height: int, top: tuple[int, int, int], bottom: tuple[int, int, int]
) -> Image.Image:
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        blend = y / max(height - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * blend) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    return image


def make_portrait(path: Path, *, initials: str = "M") -> None:
    image = _gradient(600, 750, (24, 35, 55), (58, 74, 96))
    draw = ImageDraw.Draw(image)
    draw.rectangle([(18, 18), (582, 732)], outline=(185, 148, 82), width=3)
    draw.ellipse([(190, 200), (410, 430)], fill=(78, 96, 120), outline=(185, 148, 82), width=2)
    draw.rectangle([(210, 480), (390, 620)], fill=(70, 88, 112), outline=(185, 148, 82), width=1)
    draw.text((300, 680), initials, fill=(185, 148, 82))
    image.save(path, "JPEG", quality=88)


def make_photo(path: Path, *, variant: int) -> None:
    palettes = [
        ((18, 26, 38), (96, 120, 150)),
        ((30, 42, 34), (120, 150, 110)),
        ((52, 38, 30), (160, 130, 90)),
    ]
    top, bottom = palettes[variant % len(palettes)]
    image = _gradient(800, 600, top, bottom)
    draw = ImageDraw.Draw(image)
    for index in range(4):
        offset = 60 + index * 150
        draw.rectangle(
            [(offset, 120 + index * 40), (offset + 180, 420 + index * 30)],
            outline=(205, 205, 205),
            width=2,
        )
    draw.ellipse([(520, 90), (720, 290)], outline=(230, 210, 170), width=2)
    image.save(path, "JPEG", quality=86)


def make_voice(path: Path, *, seconds: float = 2.5, frequency: float = 220.0) -> None:
    sample_rate = 22050
    frames = bytearray()
    total = int(sample_rate * seconds)
    for index in range(total):
        value = int(12000 * math.sin(2 * math.pi * frequency * index / sample_rate))
        frames += struct.pack("<h", value)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(bytes(frames))


def _certificate_pdf(
    path: Path,
    *,
    title: str,
    name: str,
    dob: str,
    dod: str,
    reg_no: str,
    place: str,
) -> None:
    pdf = pdf_canvas.Canvas(str(path), pagesize=(595, 842))  # A4
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawCentredString(297, 770, "GOVERNMENT OF KERALA")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(297, 735, title)
    pdf.setFont("Helvetica", 12)
    lines = [
        f"Registration No: {reg_no}",
        f"Name of Deceased: {name}",
        f"Date of Birth: {dob}",
        f"Date of Death: {dod}",
        f"Place of Death: {place}",
        "This is a synthetic document generated for software testing.",
    ]
    y = 660
    for line in lines:
        pdf.drawString(80, y, line)
        y -= 26
    pdf.showPage()
    pdf.save()


def make_certificate_match(
    path: Path,
    *,
    name: str = "Mathew E2E Heritage",
    dob: str = "1950-04-12",
    dod: str = "2025-11-03",
    reg_no: str = "E2E-REG-0001",
) -> None:
    _certificate_pdf(
        path,
        title="DEATH CERTIFICATE",
        name=name,
        dob=dob,
        dod=dod,
        reg_no=reg_no,
        place="Thiruvananthapuram",
    )


def make_certificate_mismatch(path: Path) -> None:
    _certificate_pdf(
        path,
        title="DEATH CERTIFICATE",
        name="Unrelated Different Person",
        dob="1931-01-05",
        dod="2019-06-30",
        reg_no="E2E-REG-9999",
        place="Kozhikode",
    )


def make_obituary(path: Path) -> None:
    _certificate_pdf(
        path,
        title="NEWSPAPER OBITUARY NOTICE",
        name="Mathew E2E Heritage",
        dob="1950-04-12",
        dod="2025-11-03",
        reg_no="E2E-OBIT-0002",
        place="Thiruvananthapuram",
    )


def make_blank_image(path: Path) -> None:
    Image.new("RGB", (400, 300), (255, 255, 255)).save(path, "JPEG")


def make_landscape_image(path: Path) -> None:
    make_photo(path, variant=2)


def make_text_note(path: Path) -> None:
    path.write_text("Not a document - plain text for wrong-document tests.\n", encoding="utf-8")


def generate_all(base: Path) -> AssetSet:
    base.mkdir(parents=True, exist_ok=True)

    portrait = base / "portrait.jpg"
    make_portrait(portrait)

    photos = [base / f"photo_{index}.jpg" for index in (1, 2, 3)]
    for index, photo in enumerate(photos):
        make_photo(photo, variant=index)

    voice = base / "voice.wav"
    make_voice(voice)

    certificate_match = base / "certificate_match.pdf"
    make_certificate_match(certificate_match)
    certificate_mismatch = base / "certificate_mismatch.pdf"
    make_certificate_mismatch(certificate_mismatch)
    obituary = base / "obituary.pdf"
    make_obituary(obituary)

    blank_image = base / "blank.jpg"
    make_blank_image(blank_image)
    landscape_image = base / "landscape.jpg"
    make_landscape_image(landscape_image)
    text_note = base / "note.txt"
    make_text_note(text_note)

    return AssetSet(
        portrait=portrait,
        photos=photos,
        voice=voice,
        certificate_match=certificate_match,
        certificate_mismatch=certificate_mismatch,
        obituary=obituary,
        blank_image=blank_image,
        landscape_image=landscape_image,
        text_note=text_note,
    )
