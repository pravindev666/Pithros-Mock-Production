"""Environment files for the E2E stack, parsed without importing app settings.

The unit-test conftest imports the application with test values, so the E2E
harness reads `.env.development` / `.env.local` directly and hands the resulting
environment to the server subprocesses it starts. Precedence mirrors the app's
own loading order: `.env.development`, then `.env.local` on top.
"""

from __future__ import annotations

from pathlib import Path


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        values[key.strip()] = value
    return values


def backend_env(project_root: Path) -> dict[str, str]:
    backend_dir = project_root / "backend"
    return {
        **parse_env_file(backend_dir / ".env.development"),
        **parse_env_file(backend_dir / ".env.local"),
    }


def frontend_env(project_root: Path) -> dict[str, str]:
    frontend_dir = project_root / "Pithros"
    return {
        **parse_env_file(frontend_dir / ".env"),
        **parse_env_file(frontend_dir / ".env.development"),
        **parse_env_file(frontend_dir / ".env.local"),
    }
