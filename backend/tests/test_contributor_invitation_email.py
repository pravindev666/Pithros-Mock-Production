"""Contributor invitation email: builder, worker task, enqueue, and Mailpit delivery.

The Mailpit test is skipped automatically when no Mailpit runs on 127.0.0.1:8025,
so the default suite stays green without it.
"""

from __future__ import annotations

import contextlib
from datetime import UTC, datetime, timedelta

import httpx
import pytest

from app.contributors.schemas import ContributorInviteRequest
from app.contributors.service import invite
from app.core.config import settings
from app.core.enums import ContributorRole, ContributorStatus
from app.core.security import hash_token
from app.email.invitations import send_contributor_invitation
from app.memorials.models import MemorialContributor
from app.memorials.permissions import resolve_access
from app.workers.tasks import email_tasks

MAILPIT = "http://127.0.0.1:8025"


def _pending(db, memorial, *, token, email="invitee@example.com", display="Invitee"):
    contributor = MemorialContributor(
        memorial_id=memorial.id,
        invited_email=email,
        display_name=display,
        role=ContributorRole.VIEWER.value,
        status=ContributorStatus.INVITED.value,
        invitation_token_hash=hash_token(token),
        invitation_expires_at=datetime.now(UTC) + timedelta(hours=24),
    )
    db.add(contributor)
    db.flush()
    return contributor


def test_builder_includes_accept_link_and_no_secrets(monkeypatch):
    captured: dict = {}
    monkeypatch.setattr(
        "app.email.invitations.send_email", lambda **kw: captured.update(kw) or True
    )
    ok = send_contributor_invitation(
        recipient="kin@example.com",
        recipient_name="Kin",
        memorial_name="Mary OBrien",
        inviter_name="Sam",
        invitation_url="https://pithros.in/invite/SEKRETTOKEN",
        expires_at=datetime.now(UTC),
    )
    assert ok is True
    assert captured["to"] == "kin@example.com"
    assert "Mary OBrien" in captured["subject"]
    body = f"{captured['text']}\n{captured['html']}"
    assert "https://pithros.in/invite/SEKRETTOKEN" in body  # token only inside the link
    assert "Accept Invitation" in body
    assert "expires" in body.lower()
    assert "password" not in body.lower()


def test_task_skips_when_email_disabled(monkeypatch, db_session, make_user, make_memorial):
    monkeypatch.setattr(settings, "email_enabled", False, raising=False)
    user = make_user(name="Steward", email="s1@example.com")
    memorial = make_memorial(steward=user)
    contributor = _pending(db_session, memorial, token="invite-token")
    called = {"n": 0}
    monkeypatch.setattr(
        email_tasks,
        "send_contributor_invitation",
        lambda **kw: called.update(n=called["n"] + 1) or True,
    )
    out = email_tasks.deliver_contributor_invitation(str(contributor.id), "invite-token")
    assert out["status"] == "disabled"
    assert called["n"] == 0


def test_task_sends_for_pending_invitation(monkeypatch, db_session, make_user, make_memorial):
    monkeypatch.setattr(settings, "email_enabled", True, raising=False)
    monkeypatch.setattr(email_tasks, "SessionLocal", lambda: contextlib.nullcontext(db_session))
    user = make_user(name="Steward", email="s2@example.com")
    memorial = make_memorial(steward=user)
    contributor = _pending(db_session, memorial, token="invite-token")
    sent: dict = {}
    monkeypatch.setattr(
        email_tasks, "send_contributor_invitation", lambda **kw: sent.update(kw) or True
    )
    out = email_tasks.deliver_contributor_invitation(str(contributor.id), "invite-token")
    assert out["status"] == "sent"
    assert sent["recipient"] == "invitee@example.com"
    assert sent["invitation_url"].endswith("/invite/invite-token")


def test_task_drops_stale_token(monkeypatch, db_session, make_user, make_memorial):
    monkeypatch.setattr(settings, "email_enabled", True, raising=False)
    monkeypatch.setattr(email_tasks, "SessionLocal", lambda: contextlib.nullcontext(db_session))
    user = make_user(name="Steward", email="s3@example.com")
    memorial = make_memorial(steward=user)
    contributor = _pending(db_session, memorial, token="current-token")
    called = {"n": 0}
    monkeypatch.setattr(
        email_tasks,
        "send_contributor_invitation",
        lambda **kw: called.update(n=called["n"] + 1) or True,
    )
    out = email_tasks.deliver_contributor_invitation(str(contributor.id), "OLD-rotated-token")
    assert out["status"] == "stale"
    assert called["n"] == 0


def test_task_raises_on_delivery_failure_for_retry(
    monkeypatch, db_session, make_user, make_memorial
):
    monkeypatch.setattr(settings, "email_enabled", True, raising=False)
    monkeypatch.setattr(email_tasks, "SessionLocal", lambda: contextlib.nullcontext(db_session))
    user = make_user(name="Steward", email="s4@example.com")
    memorial = make_memorial(steward=user)
    contributor = _pending(db_session, memorial, token="invite-token")
    monkeypatch.setattr(email_tasks, "send_contributor_invitation", lambda **kw: False)
    with pytest.raises(email_tasks.EmailDeliveryError):
        email_tasks.deliver_contributor_invitation(str(contributor.id), "invite-token")


def test_invite_enqueues_exactly_one_email(monkeypatch, db_session, make_user, make_memorial):
    enqueued: list[dict] = []
    monkeypatch.setattr(
        "app.workers.celery_app.enqueue", lambda task, **kw: enqueued.append(kw) or "task-id"
    )
    user = make_user(name="Steward", email="s5@example.com")
    memorial = make_memorial(steward=user)
    access = resolve_access(db_session, memorial, user)
    contributor, token = invite(
        db_session,
        memorial=memorial,
        access=access,
        payload=ContributorInviteRequest(email="new@example.com", role=ContributorRole.VIEWER),
        request=None,
    )
    assert len(enqueued) == 1
    assert enqueued[0]["token"] == token
    assert enqueued[0]["contributor_id"] == str(contributor.id)


def _mailpit_up() -> bool:
    try:
        return httpx.get(f"{MAILPIT}/api/v1/messages", timeout=2).status_code == 200
    except Exception:
        return False


@pytest.mark.skipif(not _mailpit_up(), reason="Mailpit not running on 127.0.0.1:8025")
def test_invitation_email_lands_in_mailpit(monkeypatch, db_session, make_user, make_memorial):
    monkeypatch.setattr(settings, "email_enabled", True, raising=False)
    monkeypatch.setattr(settings, "smtp_host", "127.0.0.1", raising=False)
    monkeypatch.setattr(settings, "smtp_port", 1025, raising=False)
    monkeypatch.setattr(email_tasks, "SessionLocal", lambda: contextlib.nullcontext(db_session))

    user = make_user(name="Steward", email="s6@example.com")
    memorial = make_memorial(steward=user)
    contributor = _pending(
        db_session, memorial, email="family.kin@example.com", token="mailpit-token"
    )
    # Fixtures such as memorial creation can send unrelated mail; clear the sink now.
    with contextlib.suppress(Exception):
        httpx.delete(f"{MAILPIT}/api/v1/messages", timeout=5)

    out = email_tasks.deliver_contributor_invitation(str(contributor.id), "mailpit-token")
    assert out["status"] == "sent"

    messages = httpx.get(f"{MAILPIT}/api/v1/messages", timeout=5).json()["messages"]
    assert len(messages) == 1, messages
    message = messages[0]
    assert any(entry["Address"] == "family.kin@example.com" for entry in message["To"])
    detail = httpx.get(f"{MAILPIT}/api/v1/message/{message['ID']}", timeout=5).json()
    body = f"{detail.get('Text', '')}\n{detail.get('HTML', '')}"
    assert "/invite/mailpit-token" in body
    assert "password" not in body.lower()
