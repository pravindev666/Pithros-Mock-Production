"""Cashfree Payments client.

The server is the only party that may declare a payment successful, and it does so
by asking Cashfree directly — never by trusting a browser payload. This client is
the single place that talks to the gateway, so the rules live in one spot:

* order creation returns the *real* payment session id the checkout SDK needs
* order/payment reads are how `/billing/verify` and the webhook confirm money
* refunds are issued through the same authenticated channel

Everything is injectable (`transport`, `base_url`) so the whole flow can be
exercised against a local simulator with real signing, with no network and no
sandbox keys.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 20.0

# Test seam: a local simulator (with real signing) can be injected so the whole
# flow runs offline. Production never sets this.
_TEST_TRANSPORT: httpx.BaseTransport | None = None


def set_transport_for_testing(transport: httpx.BaseTransport | None) -> None:
    global _TEST_TRANSPORT
    _TEST_TRANSPORT = transport


class PaymentGatewayError(AppError):
    status_code = 502
    code = "payment_gateway_error"


class PaymentGatewayNotConfiguredError(AppError):
    """Raised instead of pretending a payment happened.

    With no credentials the platform cannot confirm money, so it must refuse —
    never fabricate a session or an approval.
    """

    status_code = 503
    code = "payment_gateway_not_configured"


class PaymentNotConfirmedError(AppError):
    status_code = 409
    code = "payment_not_confirmed"


@dataclass(frozen=True)
class GatewayOrder:
    order_id: str
    status: str
    amount_minor: int
    currency: str


@dataclass(frozen=True)
class GatewayPayment:
    cf_payment_id: str | None
    payment_status: str
    payment_amount_minor: int
    payment_method: str | None = None


def verify_webhook_signature(
    *,
    raw_body: bytes,
    timestamp: str | None,
    signature: str | None,
    secret: str | None = None,
) -> bool:
    """Cashfree signs `timestamp + raw_body` with the webhook secret (base64 HMAC-SHA256).

    Compares in constant time, and refuses when anything is missing — an unsigned
    request is not a payment.
    """
    webhook_secret = secret if secret is not None else settings.cashfree_webhook_secret
    if not webhook_secret or not timestamp or not signature:
        return False

    signed_payload = timestamp.encode("utf-8") + raw_body
    expected = base64.b64encode(
        hmac.new(webhook_secret.encode("utf-8"), signed_payload, hashlib.sha256).digest()
    ).decode("ascii")

    return hmac.compare_digest(expected, signature)


class CashfreeClient:
    def __init__(
        self,
        *,
        app_id: str,
        secret_key: str,
        base_url: str | None = None,
        api_version: str | None = None,
        transport: httpx.BaseTransport | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self._app_id = app_id
        self._secret_key = secret_key
        self._base_url = (base_url or settings.cashfree_base_url).rstrip("/")
        self._api_version = api_version or settings.cashfree_api_version
        self._client = httpx.Client(timeout=timeout, transport=transport)

    @classmethod
    def from_settings(cls, *, transport: httpx.BaseTransport | None = None) -> CashfreeClient:
        if not settings.cashfree_app_id or not settings.cashfree_secret_key:
            raise PaymentGatewayNotConfiguredError(
                "Cashfree credentials are not configured, so payments cannot be confirmed."
            )
        return cls(
            app_id=settings.cashfree_app_id,
            secret_key=settings.cashfree_secret_key,
            transport=transport or _TEST_TRANSPORT,
        )

    # ─── Transport ──────────────────────────────────────────────────────────
    def _headers(self) -> dict[str, str]:
        return {
            "x-client-id": self._app_id,
            "x-client-secret": self._secret_key,
            "x-api-version": self._api_version,
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, *, json_body: dict | None = None) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        try:
            response = self._client.request(method, url, headers=self._headers(), json=json_body)
        except httpx.HTTPError as exc:
            logger.warning("cashfree_request_failed", extra={"path": path}, exc_info=True)
            raise PaymentGatewayError("The payment gateway could not be reached.") from exc

        if response.status_code >= 400:
            logger.warning(
                "cashfree_error_response",
                extra={"path": path, "status": response.status_code},
            )
            raise PaymentGatewayError(
                "The payment gateway rejected that request.",
                details={"path": path, "statusCode": response.status_code},
            )
        try:
            return response.json()
        except ValueError as exc:
            raise PaymentGatewayError(
                "The payment gateway returned an unreadable response."
            ) from exc

    # ─── Operations ─────────────────────────────────────────────────────────
    def create_order(
        self,
        *,
        order_id: str,
        amount_minor: int,
        currency: str,
        customer_id: str,
        return_url: str | None = None,
        notify_url: str | None = None,
    ) -> dict[str, Any]:
        """Create the gateway order and return its payload (includes `payment_session_id`)."""
        body: dict[str, Any] = {
            "order_id": order_id,
            # Cashfree expects the major unit.
            "order_amount": round(amount_minor / 100, 2),
            "order_currency": currency,
            "customer_details": {"customer_id": customer_id},
            "order_meta": {
                key: value
                for key, value in {"return_url": return_url, "notify_url": notify_url}.items()
                if value
            },
        }
        return self._request("POST", "/orders", json_body=body)

    def get_order(self, order_id: str) -> GatewayOrder:
        payload = self._request("GET", f"/orders/{order_id}")
        return GatewayOrder(
            order_id=str(payload.get("order_id") or order_id),
            status=str(payload.get("order_status") or "UNKNOWN").upper(),
            amount_minor=round(float(payload.get("order_amount") or 0) * 100),
            currency=str(payload.get("order_currency") or "INR").upper(),
        )

    def list_payments(self, order_id: str) -> list[GatewayPayment]:
        payload = self._request("GET", f"/orders/{order_id}/payments")
        if isinstance(payload, dict):
            # Cashfree returns a bare array for this endpoint; tolerate an envelope too.
            payload = payload.get("payments", [])
        return [
            GatewayPayment(
                cf_payment_id=str(item.get("cf_payment_id")) if item.get("cf_payment_id") else None,
                payment_status=str(item.get("payment_status") or "UNKNOWN").upper(),
                payment_amount_minor=round(float(item.get("payment_amount") or 0) * 100),
                payment_method=item.get("payment_group"),
            )
            for item in payload
        ]

    def confirm_paid_order(self, *, order_id: str, expected_amount_minor: int) -> GatewayPayment:
        """Authoritative check: is this order actually paid, for the right amount?

        Both conditions are required. A paid order for a different amount than the
        one recorded is a tampered checkout, not a success.
        """
        order = self.get_order(order_id)
        payments = self.list_payments(order_id)
        successful = [p for p in payments if p.payment_status in {"SUCCESS", "PAID"}]

        if order.status not in {"PAID", "SUCCESS"} and not successful:
            raise PaymentNotConfirmedError("That payment has not been completed at the gateway.")
        if not successful:
            raise PaymentNotConfirmedError("The gateway reports no successful payment yet.")

        paid = successful[-1]
        if paid.payment_amount_minor != expected_amount_minor:
            logger.warning(
                "cashfree_amount_mismatch",
                extra={
                    "order_id": order_id,
                    "expected": expected_amount_minor,
                    "paid": paid.payment_amount_minor,
                },
            )
            raise PaymentNotConfirmedError("The amount paid does not match the order amount.")
        return paid

    def create_refund(
        self,
        *,
        order_id: str,
        refund_id: str,
        amount_minor: int,
        note: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "refund_id": refund_id,
            "refund_amount": round(amount_minor / 100, 2),
            "refund_note": note or "Refund issued by Pithros",
        }
        return self._request("POST", f"/orders/{order_id}/refunds", json_body=body)
