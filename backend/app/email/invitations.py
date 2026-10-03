"""Contributor invitation email — built only from persisted records, no secrets.

The invitation token appears only inside the intended accept link; nothing else in
the message exposes credentials, internal ids, or authorization data.
"""

from __future__ import annotations

from datetime import datetime

from app.core.config import settings
from app.email.service import send_email


def _expiry_text(expires_at: datetime | None) -> str:
    if expires_at is None:
        return "in a few days"
    return expires_at.strftime("%d %b %Y, %H:%M UTC")


def send_contributor_invitation(
    *,
    recipient: str,
    recipient_name: str,
    memorial_name: str,
    inviter_name: str,
    invitation_url: str,
    expires_at: datetime | None,
) -> bool:
    expiry = _expiry_text(expires_at)
    subject = f"You're invited to help remember {memorial_name} on Pithros"

    text = (
        f"Hello {recipient_name},\n\n"
        f"{inviter_name} has invited you to contribute to the memorial for "
        f"{memorial_name} on Pithros.\n\n"
        "Pithros is a permanent place to remember someone who has died — share "
        "memories, photographs and tributes with the family, together.\n\n"
        f"Accept the invitation:\n{invitation_url}\n\n"
        f"This invitation expires on {expiry}.\n\n"
        "If you were not expecting this invitation, you can safely ignore this email.\n\n"
        "— The Pithros team\n"
        "https://pithros.in\n"
    )

    help_url = settings.frontend_base_url.rstrip("/")
    html = (
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:520px">'
        '<h2 style="color:#7c3aed;margin:0 0 16px">Pithros</h2>'
        f"<p>Hello {recipient_name},</p>"
        f"<p><strong>{inviter_name}</strong> has invited you to contribute to the memorial for "
        f"<strong>{memorial_name}</strong> on Pithros — a permanent place to remember someone "
        "who has died.</p>"
        '<p style="margin:28px 0">'
        f'<a href="{invitation_url}" style="background:#7c3aed;color:#ffffff;padding:12px 22px;'
        'border-radius:6px;text-decoration:none;display:inline-block">Accept Invitation</a></p>'
        '<p style="color:#6b7280;font-size:13px">Or paste this link into your browser:<br>'
        f"{invitation_url}</p>"
        f'<p style="color:#6b7280;font-size:13px">This invitation expires on {expiry}.</p>'
        '<p style="color:#6b7280;font-size:12px">If you were not expecting this invitation you can '
        f'ignore this email. Pithros · <a href="{help_url}">{help_url}</a></p>'
        "</div>"
    )

    return send_email(to=recipient, subject=subject, text=text, html=html)
