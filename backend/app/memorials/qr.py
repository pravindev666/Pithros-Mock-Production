"""QR code generation for memorials.

Produces print- and engraving-ready QR codes in PNG and SVG formats that resolve
directly to the memorial's canonical public URL.
"""

from __future__ import annotations

import io
from typing import Literal

import qrcode
import qrcode.image.svg

from app.core.config import settings


def build_memorial_url(slug: str) -> str:
    """Canonical public URL that the physical or digital QR code resolves to."""
    base = settings.frontend_base_url.rstrip("/")
    return f"{base}/m/{slug}"


def generate_qr_code(
    url: str,
    *,
    format: Literal["png", "svg"] = "png",
    box_size: int = 10,
    border: int = 2,
) -> bytes:
    """Generate a high-contrast, scan-optimized QR code in PNG or SVG format."""
    if format == "svg":
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=box_size,
            border=border,
            image_factory=qrcode.image.svg.SvgPathImage,
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image()
        buf = io.BytesIO()
        img.save(buf)
        return buf.getvalue()

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(url)
    qr.make(fit=True)
    pil_img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return buf.getvalue()
