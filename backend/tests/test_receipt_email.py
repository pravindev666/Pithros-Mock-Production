"""Receipt email through the real backend and a Mailpit sink.

Skipped automatically when Mailpit is not running, so the default suite stays
green without it. Start it with the local lab (SMTP 127.0.0.1:1025,
UI 127.0.0.1:8025) to run these.
"""

from __future__ import annotations

import contextlib

import httpx
import pytest

from app.billing.cashfree import PaymentNotConfirmedError
from app.billing.catalog import seed_pricing_catalog
from app.billing.schemas import CreateOrderRequest, VerifyPaymentRequest
from app.billing.service import create_order, verify_and_activate_payment
from app.core.config import settings

MAILPIT = "http://127.0.0.1:8025"


def _mailpit_up() -> bool:
    try:
        return httpx.get(f"{MAILPIT}/api/v1/messages", timeout=2).status_code == 200
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _mailpit_up(), reason="Mailpit not running on 127.0.0.1:8025"
)


@pytest.fixture(autouse=True)
def _enable_email(monkeypatch):
    monkeypatch.setattr(settings, "email_enabled", True, raising=False)
    monkeypatch.setattr(settings, "smtp_host", "127.0.0.1", raising=False)
    monkeypatch.setattr(settings, "smtp_port", 1025, raising=False)
    with contextlib.suppress(Exception):
        httpx.delete(f"{MAILPIT}/api/v1/messages", timeout=5)
    yield


def _messages() -> list[dict]:
    return httpx.get(f"{MAILPIT}/api/v1/messages", timeout=5).json().get("messages", [])


def _text(message_id: str) -> str:
    detail = httpx.get(f"{MAILPIT}/api/v1/message/{message_id}", timeout=5).json()
    return f"{detail.get('Text', '')}\n{detail.get('HTML', '')}"


def _buy(db_session, user, memorial, price_id: str) -> str:
    order = create_order(
        user, CreateOrderRequest(planPriceId=price_id, memorialId=memorial.id), db_session
    )
    response = verify_and_activate_payment(
        user, VerifyPaymentRequest(internalOrderId=order.internal_order_id), db_session
    )
    assert response.invoice_number
    return response.invoice_number


def test_successful_payment_sends_one_receipt(db_session, make_user, make_memorial):
    user = make_user(name="Receipt Steward", email="receipt.test@example.com")
    memorial = make_memorial(steward=user, premium=False)
    seed_pricing_catalog(db_session)

    invoice_number = _buy(db_session, user, memorial, "memorial_care_annual_v1")

    messages = _messages()
    assert len(messages) == 1, messages
    message = messages[0]
    assert invoice_number in message["Subject"]
    recipients = [entry["Address"] for entry in message["To"]]
    assert "receipt.test@example.com" in recipients

    body = _text(message["ID"])
    assert "PITHROS Memorial Care" in body
    assert "INR 999.00" in body
    assert "Payment date:" in body
    # No secrets or internal tokens leak into the message.
    assert "token" not in body.lower()
    assert "password" not in body.lower()


def test_repeated_verification_does_not_send_a_duplicate_receipt(
    db_session, make_user, make_memorial
):
    user = make_user(name="Dup Steward", email="dup.test@example.com")
    memorial = make_memorial(steward=user, premium=False)
    seed_pricing_catalog(db_session)
    order = create_order(
        user,
        CreateOrderRequest(planPriceId="memorial_care_annual_v1", memorialId=memorial.id),
        db_session,
    )
    verify_and_activate_payment(
        user, VerifyPaymentRequest(internalOrderId=order.internal_order_id), db_session
    )
    # Second verify is an idempotent no-op and must not email again.
    verify_and_activate_payment(
        user, VerifyPaymentRequest(internalOrderId=order.internal_order_id), db_session
    )

    assert len(_messages()) == 1


def test_unpaid_order_sends_no_receipt(db_session, make_user, make_memorial, gateway_sim):
    user = make_user(name="Unpaid Steward", email="unpaid.test@example.com")
    memorial = make_memorial(steward=user, premium=False)
    seed_pricing_catalog(db_session)
    order = create_order(
        user,
        CreateOrderRequest(planPriceId="memorial_care_annual_v1", memorialId=memorial.id),
        db_session,
    )
    gateway_sim.set_unpaid(order.internal_order_id)

    with pytest.raises(PaymentNotConfirmedError):
        verify_and_activate_payment(
            user, VerifyPaymentRequest(internalOrderId=order.internal_order_id), db_session
        )

    assert _messages() == []
