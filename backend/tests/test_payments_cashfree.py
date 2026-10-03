"""Cashfree security: money is confirmed by the gateway, never by the caller.

These cover the two holes this stage closes — a client-declared success, and an
unsigned webhook activating anything — plus the browser-closed activation path
(a signed webhook with no browser present) and webhook idempotency.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os

import pytest
from sqlalchemy import select

from app.billing import service
from app.billing.catalog import seed_pricing_catalog
from app.billing.models import Invoice, Payment, Subscription
from app.billing.schemas import CreateOrderRequest
from app.core.enums import PaymentStatus

WEBHOOK_SECRET = "cf_test_webhook_secret"


@pytest.fixture(autouse=True)
def ensure_catalog(db_session):
    seed_pricing_catalog(db_session)


def _sign(body: bytes, timestamp: str) -> str:
    return base64.b64encode(
        hmac.new(WEBHOOK_SECRET.encode(), timestamp.encode() + body, hashlib.sha256).digest()
    ).decode()


def _order(db_session, user, **kwargs):
    return service.create_order(
        user, CreateOrderRequest(plan_price_id="plan_care_monthly", **kwargs), db_session
    )


def _payment(db_session, order_id: str) -> Payment:
    return db_session.scalars(select(Payment).where(Payment.internal_order_id == order_id)).one()


def _subscriptions(db_session, payment: Payment) -> list[Subscription]:
    return list(
        db_session.scalars(select(Subscription).where(Subscription.id == payment.subscription_id))
    )


def _invoices(db_session, payment: Payment) -> list[Invoice]:
    return list(db_session.scalars(select(Invoice).where(Invoice.payment_id == payment.id)))


def _webhook_payload(order_id: str) -> bytes:
    import json

    return json.dumps(
        {
            "type": "PAYMENT_SUCCESS_WEBHOOK",
            "data": {
                "order": {"order_id": order_id},
                "payment": {"cf_payment_id": f"cf_{order_id}"},
            },
        }
    ).encode("utf-8")


def test_order_uses_real_gateway_session(client, db_session, make_user, auth, gateway_sim):
    user = make_user(name="Payer")

    response = client.post(
        "/api/v1/billing/orders",
        json={"planPriceId": "plan_care_monthly"},
        headers=auth(user),
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["paymentSessionId"].startswith("sess_sim_")
    assert any(call.startswith("POST /orders") for call in gateway_sim.calls)


def test_client_cannot_declare_success(client, db_session, make_user, auth, gateway_sim):
    user = make_user(name="Payer")
    order = _order(db_session, user)
    gateway_sim.set_unpaid(order.internal_order_id)

    response = client.post(
        "/api/v1/billing/verify",
        json={
            "internalOrderId": order.internal_order_id,
            "gatewayPaymentId": "cf_made_up_by_the_client",
            "paymentMethodType": "UPI",
        },
        headers=auth(user),
    )

    assert response.status_code == 409, response.text
    payment = _payment(db_session, order.internal_order_id)
    assert payment.status == PaymentStatus.PENDING.value
    assert payment.subscription_id is None
    assert _invoices(db_session, payment) == []


def test_a_tampered_amount_is_refused(client, db_session, make_user, auth, gateway_sim):
    user = make_user(name="Payer")
    order = _order(db_session, user)
    gateway_sim.set_amount(order.internal_order_id, order.amount_minor / 100 + 500)

    response = client.post(
        "/api/v1/billing/verify",
        json={"internalOrderId": order.internal_order_id, "gatewayPaymentId": "cf_x"},
        headers=auth(user),
    )

    assert response.status_code == 409, response.text
    assert _payment(db_session, order.internal_order_id).status == PaymentStatus.PENDING.value


def test_another_account_cannot_settle_someone_elses_order(
    client, db_session, make_user, auth, gateway_sim
):
    payer = make_user(name="Payer")
    intruder = make_user(name="Intruder")
    order = _order(db_session, payer)

    response = client.post(
        "/api/v1/billing/verify",
        json={"internalOrderId": order.internal_order_id, "gatewayPaymentId": "cf_x"},
        headers=auth(intruder),
    )

    assert response.status_code == 404
    assert _payment(db_session, order.internal_order_id).status == PaymentStatus.PENDING.value


def test_signed_webhook_activates_with_no_browser_present(
    client, db_session, make_user, gateway_sim
):
    user = make_user(name="Payer")
    order = _order(db_session, user)

    body = _webhook_payload(order.internal_order_id)
    timestamp = "1730000000"
    response = client.post(
        "/api/v1/billing/webhooks/cashfree",
        content=body,
        headers={
            "content-type": "application/json",
            "x-webhook-signature": _sign(body, timestamp),
            "x-webhook-timestamp": timestamp,
            "x-webhook-id": "evt_browser_closed",
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "ok"

    payment = _payment(db_session, order.internal_order_id)
    assert payment.status == PaymentStatus.SUCCESS.value
    assert payment.subscription_id is not None
    assert len(_invoices(db_session, payment)) == 1


def test_unsigned_and_badly_signed_webhooks_are_refused(client, db_session, make_user, gateway_sim):
    user = make_user(name="Payer")
    order = _order(db_session, user)
    body = _webhook_payload(order.internal_order_id)

    unsigned = client.post(
        "/api/v1/billing/webhooks/cashfree",
        content=body,
        headers={"content-type": "application/json"},
    )
    assert unsigned.status_code == 401

    bad = client.post(
        "/api/v1/billing/webhooks/cashfree",
        content=body,
        headers={
            "content-type": "application/json",
            "x-webhook-signature": "not-a-real-signature",
            "x-webhook-timestamp": "1730000000",
        },
    )
    assert bad.status_code == 401

    payment = _payment(db_session, order.internal_order_id)
    assert payment.status == PaymentStatus.PENDING.value
    assert payment.subscription_id is None


def test_duplicate_webhook_does_not_double_activate(client, db_session, make_user, gateway_sim):
    user = make_user(name="Payer")
    order = _order(db_session, user)
    body = _webhook_payload(order.internal_order_id)
    timestamp = "1730000000"
    headers = {
        "content-type": "application/json",
        "x-webhook-signature": _sign(body, timestamp),
        "x-webhook-timestamp": timestamp,
        "x-webhook-id": "evt_duplicate",
    }

    first = client.post("/api/v1/billing/webhooks/cashfree", content=body, headers=headers)
    second = client.post("/api/v1/billing/webhooks/cashfree", content=body, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["status"] == "already_processed"

    payment = _payment(db_session, order.internal_order_id)
    assert len(_invoices(db_session, payment)) == 1


def _activate_via_webhook(client, order_id: str, event_id: str) -> None:
    body = _webhook_payload(order_id)
    timestamp = "1730000000"
    response = client.post(
        "/api/v1/billing/webhooks/cashfree",
        content=body,
        headers={
            "content-type": "application/json",
            "x-webhook-signature": _sign(body, timestamp),
            "x-webhook-timestamp": timestamp,
            "x-webhook-id": event_id,
        },
    )
    assert response.status_code == 200, response.text


def test_a_refund_only_moves_money_on_approval(client, db_session, make_user, auth, gateway_sim):
    payer = make_user(name="Payer")
    finance = make_user(name="Finance", role="admin")
    finance.admin_subrole = "finance"
    db_session.flush()

    order = _order(db_session, payer)
    _activate_via_webhook(client, order.internal_order_id, "evt_before_refund")
    payment = _payment(db_session, order.internal_order_id)
    assert payment.status == PaymentStatus.SUCCESS.value

    requested = client.post(
        f"/api/v1/billing/admin/payments/{payment.id}/refunds",
        json={"reason": "Goodwill gesture"},
        headers=auth(finance),
    )
    assert requested.status_code == 200, requested.text
    refund_id = requested.json()["id"]
    assert requested.json()["status"] == "pending"
    # Requesting is not paying: the gateway has not been asked yet.
    assert gateway_sim.refunds == []

    approved = client.post(
        f"/api/v1/billing/admin/refunds/{refund_id}/approve",
        headers=auth(finance),
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "processed"
    assert len(gateway_sim.refunds) == 1
    assert gateway_sim.refunds[0]["refund_id"] == refund_id
    assert _payment(db_session, order.internal_order_id).status == PaymentStatus.REFUNDED.value


def test_a_non_admin_cannot_issue_a_refund(client, db_session, make_user, auth, gateway_sim):
    payer = make_user(name="Payer")
    order = _order(db_session, payer)
    _activate_via_webhook(client, order.internal_order_id, "evt_refund_denied")
    payment = _payment(db_session, order.internal_order_id)

    response = client.post(
        f"/api/v1/billing/admin/payments/{payment.id}/refunds",
        json={"reason": "Trying it on"},
        headers=auth(payer),
    )

    assert response.status_code == 403
    assert gateway_sim.refunds == []


def test_a_slot_cannot_be_bound_to_another_familys_memorial(
    client, db_session, make_user, make_memorial, auth, gateway_sim
):
    """A plan buys slots for *your* memorials — not for someone else's."""
    from app.billing.models import MemorialEntitlement
    from app.core.errors import NotFoundError

    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    victims_memorial = make_memorial(steward=owner)

    order = _order(db_session, intruder)
    _activate_via_webhook(client, order.internal_order_id, "evt_slot_ownership")
    payment = _payment(db_session, order.internal_order_id)
    assert payment.subscription_id is not None

    with pytest.raises(NotFoundError):
        service.assign_memorial_slot(
            intruder, payment.subscription_id, victims_memorial.id, db_session
        )

    bound = db_session.scalars(
        select(MemorialEntitlement).where(
            MemorialEntitlement.subscription_id == payment.subscription_id,
            MemorialEntitlement.memorial_id == victims_memorial.id,
        )
    ).all()
    assert bound == []


@pytest.mark.skipif(
    not (os.getenv("CASHFREE_APP_ID") and os.getenv("CASHFREE_SECRET_KEY")),
    reason=(
        "BLOCKED BY EXTERNAL DEPENDENCY — Cashfree sandbox keys are not configured. "
        "Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY to activate this live-sandbox leg."
    ),
)
def test_live_sandbox_order_and_status_check(db_session, make_user):
    """The one leg a simulator cannot stand in for: a real sandbox order.

    Written now so adding keys turns it on with no code change.
    """
    from app.billing.cashfree import CashfreeClient

    user = make_user(name="Sandbox Payer")
    order = _order(db_session, user)

    client = CashfreeClient.from_settings()
    created = client.create_order(
        order_id=order.internal_order_id,
        amount_minor=order.amount_minor,
        currency=order.currency,
        customer_id=str(user.id),
    )
    assert created.get("payment_session_id")

    gateway_order = client.get_order(order.internal_order_id)
    assert gateway_order.order_id == order.internal_order_id
    assert gateway_order.amount_minor == order.amount_minor


# ─── Billing authorization: a plan may only bind the caller's own memorials ───


def test_a_family_cannot_buy_a_plan_for_another_familys_memorial(
    db_session, make_user, make_memorial
):
    from app.core.errors import NotFoundError

    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    victims_memorial = make_memorial(steward=owner)

    with pytest.raises(NotFoundError):
        _order(db_session, intruder, memorial_id=victims_memorial.id)


def test_a_sponsorship_link_requires_stewardship(db_session, make_user, make_memorial):
    from app.billing.schemas import CreateSponsorshipRequest
    from app.core.errors import NotFoundError

    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    victims_memorial = make_memorial(steward=owner)

    with pytest.raises(NotFoundError):
        service.create_family_sponsorship_link(
            intruder,
            CreateSponsorshipRequest(
                planPriceId="memorial_care_annual_v1", memorialId=victims_memorial.id
            ),
            db_session,
        )


def test_stewardship_change_before_the_webhook_skips_the_slot_but_still_activates(
    client, db_session, make_user, make_memorial, gateway_sim
):
    """Money is real: if stewardship moved after the order, do not bind another
    family's memorial — activate the subscription with no slot instead."""
    from app.billing.models import MemorialEntitlement
    from app.memorials.models import MemorialSteward

    buyer = make_user(name="Buyer")
    successor = make_user(name="Successor")
    memorial = make_memorial(steward=buyer, premium=False)
    order = _order(db_session, buyer, memorial_id=memorial.id)

    steward_row = db_session.scalars(
        select(MemorialSteward).where(
            MemorialSteward.memorial_id == memorial.id,
            MemorialSteward.user_id == buyer.id,
        )
    ).one()
    steward_row.user_id = successor.id
    db_session.flush()

    _activate_via_webhook(client, order.internal_order_id, "evt_stewardship_moved")

    payment = _payment(db_session, order.internal_order_id)
    assert payment.status == PaymentStatus.SUCCESS.value
    assert payment.subscription_id is not None
    # The new subscription must not have bound the memorial to a slot.
    assert (
        db_session.scalars(
            select(MemorialEntitlement).where(
                MemorialEntitlement.subscription_id == payment.subscription_id,
                MemorialEntitlement.memorial_id == memorial.id,
            )
        ).all()
        == []
    )


def test_memorial_entitlements_are_steward_scoped(client, make_user, make_memorial, auth):
    owner = make_user(name="Owner")
    intruder = make_user(name="Intruder")
    memorial = make_memorial(steward=owner)
    url = f"/api/v1/billing/memorials/{memorial.id}/entitlements"

    anonymous = client.get(url)
    assert anonymous.status_code == 401

    foreign = client.get(url, headers=auth(intruder))
    assert foreign.status_code == 404

    own = client.get(url, headers=auth(owner))
    assert own.status_code == 200, own.text
    assert "permissions" in own.json()


def test_recording_a_duplicate_webhook_event_is_race_safe(db_session):
    """The unique constraint, not the initial lookup, is the concurrency guard."""
    from app.billing.router import _record_webhook_event

    first = _record_webhook_event(
        db_session, event_id="evt_race", event_type="X", payload_hash="h", data={}
    )
    second = _record_webhook_event(
        db_session, event_id="evt_race", event_type="X", payload_hash="h", data={}
    )

    assert second.id == first.id
