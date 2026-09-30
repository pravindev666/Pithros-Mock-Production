"""Test harness.

The suite runs against a real PostgreSQL database with the schema created from
the models, and each test is wrapped in a transaction that rolls back — so tests
are isolated without the cost of rebuilding the schema.

Firebase is replaced by a fake token verifier installed through FastAPI's
dependency override on `get_token_verifier`. That is what allows the entire
authorization matrix to run in CI with no Firebase credentials.
"""

from __future__ import annotations

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


class FakeTokenVerifier:
    """Maps opaque test tokens to Firebase identities."""

    def __init__(self) -> None:
        self.tokens: dict[str, FirebaseIdentity] = {}

    def issue(self, user: User) -> str:
        token = f"test-token-{user.firebase_uid}"
        self.tokens[token] = FirebaseIdentity(
            uid=user.firebase_uid,
            email=user.email,
            email_verified=True,
            name=user.name,
            sign_in_provider="password",
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
    """Ensure Redis cache is clean for every test so stale caches don't cause false positives/negatives."""
    try:
        from app.core.redis import get_redis
        client = get_redis()
        client.flushall()
    except Exception:
        pass
    yield
    try:
        from app.core.redis import get_redis
        client = get_redis()
        client.flushall()
    except Exception:
        pass


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
    ) -> Memorial:
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
def auth(verifier):
    def _header(user: User) -> dict[str, str]:
        return {"Authorization": f"Bearer {verifier.issue(user)}"}

    return _header
