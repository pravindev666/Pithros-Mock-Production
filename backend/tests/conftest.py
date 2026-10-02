"""Test harness.

The suite runs against a real PostgreSQL database with the schema created from
the models, and each test is wrapped in a transaction that rolls back — so tests
are isolated without the cost of rebuilding the schema.

Firebase is replaced by a fake token verifier installed through FastAPI's
dependency override on `get_token_verifier`. That is what allows the entire
authorization matrix to run in CI with no Firebase credentials.
"""

from __future__ import annotations

import logging
import os
import uuid

import pytest

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://pithros:pithros@localhost:5432/pithros_test",
)

# Must be set before the application modules are imported, because settings are
# read once at import time.
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["STORAGE_BACKEND"] = "local"
# Off by default so tests are deterministic; the rate-limit test opts back in.
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["DEMO_MODE"] = "false"

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

import app.models_registry  # noqa: E402,F401
from app.auth.dependencies import get_token_verifier  # noqa: E402
from app.auth.firebase import FirebaseIdentity  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.core.enums import (  # noqa: E402
    ContributorRole,
    ContributorStatus,
    PrivacyLevel,
    PublicationState,
)
from app.core.errors import UnauthorizedError  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.memorials.models import Memorial, MemorialContributor, MemorialSteward  # noqa: E402
from app.users.models import User  # noqa: E402

logger = logging.getLogger(__name__)


class FakeTokenVerifier:
    """Maps opaque test tokens to Firebase identities."""

    def __init__(self) -> None:
        self.tokens: dict[str, FirebaseIdentity] = {}

    def issue(self, user: User, *, auth_time: int | None = None) -> str:
        import time

        token = f"test-token-{user.firebase_uid}"
        self.tokens[token] = FirebaseIdentity(
            uid=user.firebase_uid,
            email=user.email,
            email_verified=True,
            name=user.name,
            sign_in_provider="password",
            auth_time=auth_time if auth_time is not None else int(time.time()),
        )
        return token

    def verify(self, token: str) -> FirebaseIdentity:
        identity = self.tokens.get(token)
        if identity is None:
            raise UnauthorizedError("Invalid authentication token.")
        return identity


@pytest.fixture(scope="session")
def engine():
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(autouse=True)
def flush_redis_cache():
    """Ensure Redis cache is clean for every test so stale caches don't cause
    false positives/negatives."""
    try:
        from app.core.redis import get_redis

        client = get_redis()
        client.flushall()
    except Exception:
        logger.debug("redis_flush_failed", exc_info=True)
    yield
    try:
        from app.core.redis import get_redis

        client = get_redis()
        client.flushall()
    except Exception:
        logger.debug("redis_flush_failed", exc_info=True)


@pytest.fixture
def db_session(engine):
    connection = engine.connect()
    outer = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    yield session

    session.close()
    outer.rollback()
    connection.close()


@pytest.fixture
def verifier() -> FakeTokenVerifier:
    return FakeTokenVerifier()


@pytest.fixture
def client(db_session, verifier):
    def _get_db_override():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = _get_db_override
    fastapi_app.dependency_overrides[get_token_verifier] = lambda: verifier

    with TestClient(fastapi_app, raise_server_exceptions=False) as test_client:
        yield test_client

    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def make_user(db_session):
    def _make(
        *,
        name: str = "Test Person",
        email: str | None = None,
        role: str = "visitor",
    ) -> User:
        unique = uuid.uuid4().hex[:10]
        user = User(
            firebase_uid=f"uid_{unique}",
            email=email or f"{unique}@example.com",
            name=name,
            role=role,
            email_verified=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make


@pytest.fixture
def make_memorial(db_session):
    def _make(
        *,
        steward: User,
        slug: str | None = None,
        privacy: str = PrivacyLevel.PRIVATE.value,
        publication_state: str = PublicationState.PUBLISHED.value,
        full_name: str = "Test Memorial",
        premium: bool = True,
    ) -> Memorial:
        """A memorial owned by `steward`.

        Paid benefits are ON by default, because the features under test (export,
        legacy links, extra contributors, long timelines) are paid ones. Pass
        `premium=False` for the free-tier path — and assert the refusals there.
        """
        unique = uuid.uuid4().hex[:8]
        memorial = Memorial(
            slug=slug or f"memorial-{unique}",
            full_name=full_name,
            birth_date="1950-01-01",
            death_date="2024-01-01",
            birth_place="Bengaluru, India",
            short_epitaph="Loved and remembered.",
            privacy=privacy,
            publication_state=publication_state,
        )
        db_session.add(memorial)
        db_session.flush()
        db_session.add(
            MemorialSteward(memorial_id=memorial.id, user_id=steward.id, is_primary=True)
        )
        db_session.commit()
        db_session.refresh(memorial)

        if premium:
            # Put the memorial on a paid plan through the product's own flow, so the
            # fixture cannot drift from how a real upgrade assigns a slot.
            from app.billing.catalog import seed_pricing_catalog
            from app.billing.schemas import CreateOrderRequest, VerifyPaymentRequest
            from app.billing.service import create_order, verify_and_activate_payment

            seed_pricing_catalog(db_session)
            order = create_order(
                steward,
                CreateOrderRequest(
                    planPriceId="memorial_care_annual_v1", memorialId=memorial.id
                ),
                db_session,
            )
            verify_and_activate_payment(
                steward,
                VerifyPaymentRequest(internalOrderId=order.internal_order_id),
                db_session,
            )
            db_session.refresh(memorial)

        return memorial

    return _make


@pytest.fixture
def add_contributor(db_session):
    def _add(
        *,
        memorial: Memorial,
        user: User,
        role: str = ContributorRole.VIEWER.value,
        status: str = ContributorStatus.ACTIVE.value,
    ) -> MemorialContributor:
        contributor = MemorialContributor(
            memorial_id=memorial.id,
            user_id=user.id,
            role=role,
            status=status,
            invited_email=user.email,
        )
        db_session.add(contributor)
        db_session.commit()
        db_session.refresh(contributor)
        return contributor

    return _add


@pytest.fixture
def gateway_sim(monkeypatch):
    """Offline Cashfree simulator: the real client code, real signing, no network.

    A created order is PAID by default (the happy path), and a test can make it
    pending or tamper with the amount to prove the server refuses. Credentials are
    present so the "not configured" refusal does not mask a real failure.
    """
    import json as _json

    import httpx as _httpx

    from app.billing import cashfree as cashfree_module
    from app.core.config import settings

    class Simulator:
        def __init__(self) -> None:
            self.orders: dict[str, dict] = {}
            self.payments: dict[str, list[dict]] = {}
            self.refunds: list[dict] = []
            self.calls: list[str] = []

        def set_unpaid(self, order_id: str) -> None:
            self.orders[order_id]["order_status"] = "ACTIVE"
            self.payments[order_id] = []

        def set_amount(self, order_id: str, amount_major: float) -> None:
            self.orders[order_id]["order_amount"] = amount_major
            for payment in self.payments.get(order_id, []):
                payment["payment_amount"] = amount_major

        def handle(self, request: _httpx.Request) -> _httpx.Response:
            path = request.url.path
            self.calls.append(f"{request.method} {path}")
            body: dict = {}
            if request.content:
                try:
                    body = _json.loads(request.content)
                except ValueError:
                    body = {}

            if request.method == "POST" and path.endswith("/orders"):
                order_id = str(body.get("order_id"))
                amount = float(body.get("order_amount") or 0)
                self.orders[order_id] = {
                    "order_id": order_id,
                    "order_status": "PAID",
                    "order_amount": amount,
                    "order_currency": body.get("order_currency", "INR"),
                }
                self.payments[order_id] = [
                    {
                        "cf_payment_id": f"cf_{order_id}",
                        "payment_status": "SUCCESS",
                        "payment_amount": amount,
                        "payment_group": "upi",
                    }
                ]
                return _httpx.Response(
                    200,
                    json={
                        **self.orders[order_id],
                        "payment_session_id": f"sess_sim_{order_id}",
                    },
                )

            if request.method == "POST" and path.endswith("/refunds"):
                order_id = path.split("/orders/")[1].split("/")[0]
                refund = {
                    "refund_id": body.get("refund_id"),
                    "refund_amount": body.get("refund_amount"),
                    "refund_status": "SUCCESS",
                }
                self.refunds.append({"order_id": order_id, **refund})
                return _httpx.Response(200, json=refund)

            if request.method == "GET" and path.endswith("/payments"):
                order_id = path.split("/orders/")[1].split("/")[0]
                return _httpx.Response(200, json=self.payments.get(order_id, []))

            if request.method == "GET" and "/orders/" in path:
                order_id = path.split("/orders/")[1].split("/")[0]
                order = self.orders.get(order_id)
                if order is None:
                    return _httpx.Response(404, json={"message": "order not found"})
                return _httpx.Response(200, json=order)

            return _httpx.Response(404, json={"message": "unsupported"})

    fields = {
        "cashfree_app_id": "cf_test_app",
        "cashfree_secret_key": "cf_test_secret",
        "cashfree_webhook_secret": "cf_test_webhook_secret",
        "cashfree_base_url": "https://gateway.test",
    }
    originals = {name: getattr(settings, name) for name in fields}

    def _assign(name: str, value: str) -> None:
        try:
            setattr(settings, name, value)
        except Exception:  # frozen model
            object.__setattr__(settings, name, value)

    for name, value in fields.items():
        _assign(name, value)

    simulator = Simulator()
    cashfree_module.set_transport_for_testing(_httpx.MockTransport(simulator.handle))
    try:
        yield simulator
    finally:
        cashfree_module.set_transport_for_testing(None)
        for name, value in originals.items():
            _assign(name, value)


@pytest.fixture(autouse=True)
def _gateway_available(gateway_sim):
    """Every test runs with a working gateway, so nothing activates by accident."""
    return gateway_sim


@pytest.fixture
def auth(verifier):
    def _header(user: User) -> dict[str, str]:
        return {"Authorization": f"Bearer {verifier.issue(user)}"}

    return _header
