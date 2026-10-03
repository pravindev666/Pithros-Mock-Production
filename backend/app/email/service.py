"""Outbound email.

The transport is SMTP and is entirely environment-configured. It is disabled by
default, so nothing is ever sent unless an operator enables it. Local E2E points
it at a Mailpit sink; production points it at a real provider. No credentials
live in source.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    *,
    to: str,
    subject: str,
    text: str,
    html: str | None = None,
) -> bool:
    """Send one message. Best-effort: never raises into a business transaction."""
    if not to:
        return False
    if not settings.email_enabled:
        # Deliberately quiet: with no transport configured, email is a no-op and
        # the caller's transaction must not depend on it.
        logger.info("email_disabled_skipped", extra={"subject": subject})
        return False

    message = EmailMessage()
    message["From"] = f"{settings.email_from_name} <{settings.email_from_address}>"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception:
        logger.exception("email_send_failed", extra={"subject": subject})
        return False

    logger.info("email_sent", extra={"subject": subject})
    return True
