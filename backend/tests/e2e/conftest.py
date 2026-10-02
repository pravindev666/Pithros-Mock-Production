"""Full-stack E2E harness (marked `e2e`, excluded from the default run).

    Run with:  .venv\\Scripts\\python.exe -m pytest -m e2e -q

The suite drives the real product in a real browser against the real Firebase
project, real R2 buckets, and the local `pithros_e2e` PostgreSQL database. All
journeys mutate business truth only through the UI/API; direct database access
is read-only, plus the explicit setup truncation between tests and the
DB-driven storage cleanup that keeps R2 in sync with the test database.
"""

from __future__ import annotations

import json
import logging
import secrets
import uuid
from pathlib import Path

import pytest

from .support import database, storage, synthetic
from .support import firebase as firebase_tools
from .support.accounts import TEST_STEWARD_EMAIL, TestCredentials
from .support.envfile import backend_env, frontend_env
from .support.stack import StackManager

# Never echo request URLs: Firebase web API keys are public config, but test
# output should still not carry them.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
RUNTIME_DIR = Path(__file__).resolve().parent / ".runtime"


@pytest.fixture(scope="session")
def e2e_run_id() -> str:
    return uuid.uuid4().hex[:10]


@pytest.fixture(scope="session")
def e2e_stack(e2e_run_id):
    manager = StackManager(PROJECT_ROOT, RUNTIME_DIR / "logs")
    stack = manager.start()
    yield stack
    stack.stop()


@pytest.fixture(scope="session")
def backend_config() -> dict[str, str]:
    return backend_env(PROJECT_ROOT)


@pytest.fixture(scope="session")
def frontend_config() -> dict[str, str]:
    return frontend_env(PROJECT_ROOT)


@pytest.fixture(scope="session")
def firebase_app(backend_config):
    return firebase_tools.init(backend_config)


@pytest.fixture(scope="session")
def r2_client(e2e_stack, backend_config, e2e_run_id):
    client = storage.build_r2(backend_config)
    storage.preflight(client, e2e_run_id)
    yield client
    deleted, failed = storage.cleanup_objects(client)
    print(f"\n[e2e] R2 cleanup: {deleted} objects deleted, {failed} failed")


@pytest.fixture(autouse=True)
def isolate_database(e2e_stack, r2_client):
    """Delete the previous test's storage objects, then wipe the E2E database.

    The database is ours and explicitly synthetic, so truncation is legitimate
    setup — not a bypass of the journey under test.
    """
    storage.cleanup_objects(r2_client)
    database.truncate_all()
    yield


@pytest.fixture(scope="session")
def steward_password() -> TestCredentials:
    password = secrets.token_urlsafe(18)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    (RUNTIME_DIR / "e2e_credentials.json").write_text(
        json.dumps(
            {
                "email": TEST_STEWARD_EMAIL,
                "password": password,
                "note": "Generated per E2E run. Gitignored. Never commit or share.",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return TestCredentials(email=TEST_STEWARD_EMAIL, password=password)


@pytest.fixture(scope="session")
def assets(tmp_path_factory) -> synthetic.AssetSet:
    return synthetic.generate_all(tmp_path_factory.mktemp("e2e_assets"))
