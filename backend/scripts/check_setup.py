"""Setup doctor.

    python scripts/check_setup.py

Reports what is wired and what is still missing, with the exact next action for
anything that fails. Prints no secrets — hostnames and lengths only.

Exit code is 0 when the backend can serve requests, 1 otherwise.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings  # noqa: E402

OK = "  [ok]  "
BAD = "  [--]  "
WARN = "  [!!]  "

problems: list[str] = []


def section(title: str) -> None:
    print(f"\n{title}")
    print("-" * len(title))


def check_env_files() -> None:
    section("Configuration")
    environment = settings.environment
    committed = BACKEND_DIR / f".env.{environment}"
    local = BACKEND_DIR / ".env.local"

    print(f"  environment     : {environment}")
    print(f"  .env.{environment:<11}: {'loaded' if committed.exists() else 'missing'}")
    print(f"  .env.local      : {'loaded (overrides)' if local.exists() else 'not present'}")
    print(f"  demo mode       : {settings.demo_mode}")


def check_database() -> bool:
    section("PostgreSQL")
    url = settings.database_url

    host = url.split("@")[-1] if "@" in url else "(unparseable)"
    print(f"  target          : {host}")

    try:
        from sqlalchemy import create_engine, text

        started = time.time()
        engine = create_engine(url, connect_args={"connect_timeout": 15})
        with engine.connect() as conn:
            version = conn.execute(text("select version()")).scalar()
            elapsed = time.time() - started
            print(f"  connected       : yes ({elapsed:.1f}s)")
            print(f"  server          : {str(version).split(',')[0]}")

            tables = conn.execute(
                text("select count(*) from information_schema.tables where table_schema = 'public'")
            ).scalar()
            print(f"  public tables   : {tables}")

            alembic = (
                conn.execute(text("select version_num from alembic_version")).scalar()
                if tables
                else None
            )
            print(f"  alembic version : {alembic or 'NOT MIGRATED'}")

        engine.dispose()

        if not tables:
            problems.append("Database reachable but empty. Run: alembic upgrade head")
            print(f"{WARN}Run migrations: .\\.venv\\Scripts\\alembic.exe upgrade head")
            return True
        return True

    except Exception as exc:
        message = str(exc).split("\n")[0][:200]
        print("  connected       : NO")
        print(f"  error           : {message}")
        problems.append("Database unreachable.")

        if "getaddrinfo" in message or "could not translate" in message:
            print(
                f"{WARN}The host did not resolve. Supabase's direct host "
                "(db.<ref>.supabase.co) is IPv6-only; use the Session Pooler."
            )
        elif "password authentication" in message:
            print(
                f"{WARN}Wrong password. Copy it fresh from Supabase -> Connect -> Session pooler."
            )
        return False


def check_redis() -> bool:
    section("Redis")
    print(f"  target          : {settings.redis_url.split('@')[-1]}")

    try:
        from app.core.redis import get_redis

        client = get_redis()
        client.ping()
        print("  connected       : yes")
        return True
    except Exception as exc:
        print(f"  connected       : NO ({str(exc).splitlines()[0][:120]})")
        print(f"{WARN}Start it with: .\\scripts\\dev-db.ps1 start")
        problems.append("Redis unreachable.")
        return False


def check_storage() -> bool:
    section("Object storage")
    print(f"  backend         : {settings.storage_backend}")

    if settings.storage_backend == "local":
        target = BACKEND_DIR / settings.local_storage_path
        print(f"  path            : {target}")
        target.mkdir(parents=True, exist_ok=True)
        print("  writable        : yes")
        return True

    if not settings.has_storage_credentials:
        print("  credentials     : MISSING")
        problems.append("Storage backend is s3 but no R2 credentials are set.")
        return False

    try:
        from app.media.storage import storage_is_reachable

        reachable = storage_is_reachable()
        print(f"  reachable       : {'yes' if reachable else 'NO'}")
        return reachable
    except Exception as exc:
        print(f"  reachable       : NO ({str(exc)[:120]})")
        return False


def check_firebase() -> bool:
    section("Firebase Admin (identity)")
    print(f"  project id      : {settings.firebase_project_id or '(not set)'}")

    configured = settings.has_firebase_credentials
    if not configured:
        target = settings.firebase_service_account_file or "(FIREBASE_SERVICE_ACCOUNT_FILE unset)"
        print("  credentials     : MISSING")
        print(
            f"{WARN}Firebase console -> Project settings -> Service accounts\n"
            "        -> Generate new private key\n"
            "        Save the JSON to:\n"
            f"          {target}"
        )
        problems.append("Firebase Admin credentials missing; token verification will fail.")
        return False

    path = Path(settings.firebase_service_account_file or "")
    if settings.firebase_service_account_file and not path.is_absolute():
        path = BACKEND_DIR / path

    if not path.exists():
        print(f"  file            : NOT FOUND at {path}")
        print(f"{WARN}Move the downloaded JSON to that exact path.")
        problems.append("Firebase service-account file not found.")
        return False

    print(f"  file            : found ({path.name}, {path.stat().st_size} bytes)")

    try:
        import json

        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"  service account : {data.get('client_email', '(no client_email)')}")
        print(f"  key present     : {'yes' if data.get('private_key') else 'NO'}")
    except Exception as exc:
        print(f"  readable        : NO ({str(exc)[:120]})")
        problems.append("Firebase service-account file is unreadable or not valid JSON.")
        return False

    try:
        from app.auth.firebase import get_firebase_verifier

        get_firebase_verifier()._ensure_app()
        print("  initialised     : yes")
        return True
    except Exception as exc:
        print(f"  initialised     : NO ({str(exc)[:160]})")
        problems.append("Firebase Admin SDK failed to initialise.")
        return False


def main() -> int:
    print("=" * 66)
    print("  Pithros backend setup check")
    print("=" * 66)

    check_env_files()
    db_ok = check_database()
    redis_ok = check_redis()
    check_storage()
    firebase_ok = check_firebase()

    section("Summary")
    if not problems:
        print(f"{OK}Everything is wired. Start the API:")
        print("      .\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --port 8000")
        return 0

    for index, problem in enumerate(problems, start=1):
        print(f"  {index}. {problem}")

    print()
    if not (db_ok and redis_ok):
        print("  The API will start but report 'degraded' on /ready.")
    if not firebase_ok:
        print("  Sign-in will fail until Firebase Admin credentials are in place.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
