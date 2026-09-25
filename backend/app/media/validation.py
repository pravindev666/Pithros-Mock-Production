"""Upload validation.

Two-stage, because the client controls neither stage's input truthfully:

* `validate_declaration` runs at upload-intent, using the filename and MIME the
  client claims. It is a cheap rejection filter, not a security control.
* `validate_content` runs after the bytes land in storage and inspects the real
  file signature. This is the control that matters — a declared MIME type is
  trivially spoofed, so it is never trusted on its own.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from app.core.config import settings
from app.core.enums import MediaKind
from app.core.errors import ValidationError

Sniffer = Callable[[bytes], bool]


def _jpeg(head: bytes) -> bool:
    return head.startswith(b"\xff\xd8\xff")


def _png(head: bytes) -> bool:
    return head.startswith(b"\x89PNG\r\n\x1a\n")


def _gif(head: bytes) -> bool:
    return head.startswith((b"GIF87a", b"GIF89a"))


def _webp(head: bytes) -> bool:
    return head[:4] == b"RIFF" and head[8:12] == b"WEBP"


def _pdf(head: bytes) -> bool:
    return head.startswith(b"%PDF-")


def _mp4_family(head: bytes) -> bool:
    return len(head) >= 12 and head[4:8] == b"ftyp"


def _mp3(head: bytes) -> bool:
    if head.startswith(b"ID3"):
        return True
    return len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0


def _wav(head: bytes) -> bool:
    return head[:4] == b"RIFF" and head[8:12] == b"WAVE"


def _ogg(head: bytes) -> bool:
    return head.startswith(b"OggS")


def _webm(head: bytes) -> bool:
    return head.startswith(b"\x1a\x45\xdf\xa3")


def _m4a(head: bytes) -> bool:
    return _mp4_family(head)


@dataclass(frozen=True)
class MediaTypeRule:
    extension: str
    mime: str
    kind: MediaKind
    sniff: Sniffer


ALLOWED_TYPES: tuple[MediaTypeRule, ...] = (
    MediaTypeRule("jpg", "image/jpeg", MediaKind.PHOTO, _jpeg),
    MediaTypeRule("jpeg", "image/jpeg", MediaKind.PHOTO, _jpeg),
    MediaTypeRule("png", "image/png", MediaKind.PHOTO, _png),
    MediaTypeRule("gif", "image/gif", MediaKind.PHOTO, _gif),
    MediaTypeRule("webp", "image/webp", MediaKind.PHOTO, _webp),
    MediaTypeRule("pdf", "application/pdf", MediaKind.DOCUMENT, _pdf),
    MediaTypeRule("mp4", "video/mp4", MediaKind.VIDEO, _mp4_family),
    MediaTypeRule("mov", "video/quicktime", MediaKind.VIDEO, _mp4_family),
    MediaTypeRule("webm", "video/webm", MediaKind.VIDEO, _webm),
    MediaTypeRule("mp3", "audio/mpeg", MediaKind.VOICE, _mp3),
    MediaTypeRule("m4a", "audio/mp4", MediaKind.VOICE, _m4a),
    MediaTypeRule("wav", "audio/wav", MediaKind.VOICE, _wav),
    MediaTypeRule("ogg", "audio/ogg", MediaKind.VOICE, _ogg),
)

_BY_EXTENSION = {rule.extension: rule for rule in ALLOWED_TYPES}
_BY_MIME = {rule.mime: rule for rule in ALLOWED_TYPES}

# Explicit rejection of things that must never be accepted, so the error message
# explains *why* rather than just "not allowed".
BLOCKED_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"MZ", "Windows executables are not accepted."),
    (b"\x7fELF", "Executable binaries are not accepted."),
    (b"#!", "Scripts are not accepted."),
    (b"PK\x03\x04", "Compressed archives are not accepted."),
    (b"\x1f\x8b", "Compressed archives are not accepted."),
    (b"Rar!", "Compressed archives are not accepted."),
    (b"7z\xbc\xaf", "Compressed archives are not accepted."),
)


def _blocked_reason(head: bytes) -> str | None:
    for signature, reason in BLOCKED_SIGNATURES:
        if head.startswith(signature):
            return reason
    return None


def validate_declaration(
    *,
    filename: str,
    declared_mime: str | None,
    declared_size: int | None,
) -> MediaTypeRule:
    """Cheap pre-flight check at upload-intent time."""
    if "." not in filename:
        raise ValidationError("The file must have an extension.")

    extension = filename.rsplit(".", 1)[-1].lower()
    rule = _BY_EXTENSION.get(extension)
    if rule is None:
        raise ValidationError(
            f"Files of type .{extension} are not accepted.",
            details={"allowedExtensions": sorted(_BY_EXTENSION)},
        )

    if declared_mime:
        normalized = declared_mime.split(";")[0].strip().lower()
        declared_rule = _BY_MIME.get(normalized)
        if declared_rule is None:
            raise ValidationError(f"Files of type {normalized} are not accepted.")
        # image/jpeg legitimately covers .jpg and .jpeg; compare by resulting mime.
        if declared_rule.mime != rule.mime:
            raise ValidationError(
                "The file's extension and declared type do not match.",
                details={"extension": extension, "declaredMime": normalized},
            )

    if declared_size is not None:
        if declared_size <= 0:
            raise ValidationError("The file appears to be empty.")
        if declared_size > settings.max_upload_bytes:
            raise ValidationError(
                f"Files must be smaller than {settings.max_upload_bytes // (1024 * 1024)} MB.",
            )

    return rule


def validate_content(*, head: bytes, rule: MediaTypeRule, actual_size: int) -> None:
    """Verify the stored object really is what it claimed to be."""
    if not head:
        raise ValidationError("The uploaded file is empty.")

    blocked = _blocked_reason(head)
    if blocked:
        raise ValidationError(blocked)

    if not rule.sniff(head):
        raise ValidationError(
            "The file's contents do not match its extension.",
            details={"expected": rule.mime},
        )

    if actual_size <= 0:
        raise ValidationError("The uploaded file is empty.")

    if actual_size > settings.max_upload_bytes:
        raise ValidationError(
            f"Files must be smaller than {settings.max_upload_bytes // (1024 * 1024)} MB.",
        )


def rule_for_extension(extension: str) -> MediaTypeRule | None:
    return _BY_EXTENSION.get(extension.lower().lstrip("."))


def allowed_extensions() -> list[str]:
    return sorted(_BY_EXTENSION)
