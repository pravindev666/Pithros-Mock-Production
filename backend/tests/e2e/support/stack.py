"""Start and stop the real development stack for browser tests.

Ports are fixed (backend 8000, frontend 3000) to match the frontend's own
`VITE_API_BASE_URL`; if either port is occupied the harness refuses to run
rather than testing against something it did not start. Every process is spawned
from the project's own virtual environment and node_modules, with the E2E
database and local Redis wired in explicitly.
"""

from __future__ import annotations

import os
import shutil
import socket
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx

from . import database
from .envfile import backend_env

BACKEND_PORT = 8000
FRONTEND_PORT = 3000


@dataclass
class Stack:
    backend_url: str
    frontend_url: str
    env: dict[str, str]
    backend_log: Path
    worker_log: Path
    frontend_log: Path
    processes: list[subprocess.Popen] = field(default_factory=list)

    def stop(self) -> None:
        for process in self.processes:
            if process.poll() is None:
                process.terminate()
        deadline = time.time() + 15
        for process in self.processes:
            while process.poll() is None and time.time() < deadline:
                time.sleep(0.2)
            if process.poll() is None:
                process.kill()


def _base_process_env() -> dict[str, str]:
    return os.environ.copy()


def _assert_port_free(port: int) -> None:
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        probe.settimeout(1.0)
        if probe.connect_ex(("127.0.0.1", port)) == 0:
            raise RuntimeError(
                f"Port {port} is already in use. Stop the process using it before "
                "running the E2E suite (the harness starts its own stack)."
            )
    finally:
        probe.close()


def _spawn(args: list[str], *, cwd: Path, env: dict[str, str], log_path: Path) -> subprocess.Popen:
    handle = open(log_path, "ab")  # noqa: SIM115 - kept open for the process lifetime
    return subprocess.Popen(
        args,
        cwd=str(cwd),
        env=env,
        stdout=handle,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
    )


def _tail(path: Path, lines: int = 40) -> str:
    if not path.exists():
        return "(no log)"
    content = path.read_text(encoding="utf-8", errors="replace").splitlines()
    return "\n".join(content[-lines:])


def _wait_http(url: str, *, timeout: float, log_path: Path) -> None:
    deadline = time.time() + timeout
    last_error = "no response"
    while time.time() < deadline:
        try:
            response = httpx.get(url, timeout=5.0)
            if response.status_code == 200:
                return
            last_error = f"status {response.status_code}"
        except Exception as exc:  # connection refused while the server boots
            last_error = str(exc)
        time.sleep(0.5)
    raise RuntimeError(f"{url} never became ready ({last_error}). Log:\n{_tail(log_path)}")


def _wait_log(path: Path, marker: str, *, timeout: float) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if path.exists() and marker in path.read_text(encoding="utf-8", errors="replace"):
            return
        time.sleep(0.5)
    raise RuntimeError(f"'{marker}' never appeared in {path}. Log:\n{_tail(path)}")


class StackManager:
    def __init__(self, project_root: Path, runtime_dir: Path) -> None:
        self.project_root = project_root
        self.runtime_dir = runtime_dir
        self._stack: Stack | None = None

    def start(self) -> Stack:
        if self._stack is not None:
            return self._stack

        _assert_port_free(BACKEND_PORT)
        _assert_port_free(FRONTEND_PORT)

        database.ensure_database()
        database.run_alembic(self.project_root)

        self.runtime_dir.mkdir(parents=True, exist_ok=True)
        env = {
            **_base_process_env(),
            **backend_env(self.project_root),
            "DATABASE_URL": database.E2E_DATABASE_URL,
            "REDIS_URL": "redis://localhost:6379/0",
            "ENVIRONMENT": "development",
            "DEMO_MODE": "false",
            "RATE_LIMIT_ENABLED": "false",
            "EXPOSE_INVITATION_TOKENS": "true",
            "CELERY_TASK_ALWAYS_EAGER": "false",
            "LOG_LEVEL": "INFO",
        }

        # Escape hatch for environments where the browser cannot PUT to R2 (e.g.
        # bucket CORS not yet configured): PITHROS_E2E_STORAGE_BACKEND=local runs
        # the stack against the filesystem adapter instead.
        storage_override = os.environ.get("PITHROS_E2E_STORAGE_BACKEND")
        if storage_override:
            env["STORAGE_BACKEND"] = storage_override

        backend_dir = self.project_root / "backend"
        frontend_dir = self.project_root / "Pithros"
        backend_python = backend_dir / ".venv" / "Scripts" / "python.exe"
        celery_exe = backend_dir / ".venv" / "Scripts" / "celery.exe"
        vite_bin = frontend_dir / "node_modules" / "vite" / "bin" / "vite.js"
        node = shutil.which("node")
        if node is None:
            raise RuntimeError("`node` was not found on PATH; the frontend cannot start.")
        if not vite_bin.exists():
            raise RuntimeError(f"vite not found at {vite_bin}; run `npm install` in Pithros first.")

        backend_log = self.runtime_dir / "backend.log"
        worker_log = self.runtime_dir / "worker.log"
        frontend_log = self.runtime_dir / "frontend.log"

        processes: list[subprocess.Popen] = []

        processes.append(
            _spawn(
                [
                    str(backend_python),
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(BACKEND_PORT),
                ],
                cwd=backend_dir,
                env=env,
                log_path=backend_log,
            )
        )
        _wait_http(f"http://127.0.0.1:{BACKEND_PORT}/health", timeout=60, log_path=backend_log)

        processes.append(
            _spawn(
                [
                    str(celery_exe),
                    "-A",
                    "app.workers.celery_app:celery_app",
                    "worker",
                    "--loglevel=INFO",
                    "--pool=solo",
                    "--concurrency=1",
                ],
                cwd=backend_dir,
                env=env,
                log_path=worker_log,
            )
        )
        _wait_log(worker_log, "ready.", timeout=60)

        processes.append(
            _spawn(
                [node, str(vite_bin), "--port", str(FRONTEND_PORT), "--strictPort"],
                cwd=frontend_dir,
                env={**env, "BROWSER": "none"},
                log_path=frontend_log,
            )
        )
        _wait_http(f"http://127.0.0.1:{FRONTEND_PORT}/", timeout=90, log_path=frontend_log)

        self._stack = Stack(
            backend_url=f"http://127.0.0.1:{BACKEND_PORT}",
            frontend_url=f"http://localhost:{FRONTEND_PORT}",
            env=env,
            backend_log=backend_log,
            worker_log=worker_log,
            frontend_log=frontend_log,
            processes=processes,
        )
        return self._stack
