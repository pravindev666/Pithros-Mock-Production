"""Structured JSON logging with per-request correlation IDs."""

from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_var: ContextVar[str | None] = ContextVar("user_id", default=None)

_RESERVED = {
    "args",
    "asctime",
    "created",
    "exc_info",
    "exc_text",
    "filename",
    "funcName",
    "levelname",
    "levelno",
    "lineno",
    "module",
    "msecs",
    "message",
    "msg",
    "name",
    "pathname",
    "process",
    "processName",
    "relativeCreated",
    "stack_info",
    "thread",
    "threadName",
    "taskName",
}

_SENSITIVE_KEYS = {
    "password",
    "token",
    "id_token",
    "access_token",
    "refresh_token",
    "authorization",
    "api_key",
    "secret",
    "private_key",
    "card_number",
    "cvv",
    "signature",
}


def _scrub(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: ("***redacted***" if key.lower() in _SENSITIVE_KEYS else _scrub(item))
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_scrub(item) for item in value]
    return value


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        request_id = request_id_var.get()
        if request_id:
            payload["request_id"] = request_id
        user_id = user_id_var.get()
        if user_id:
            payload["user_id"] = user_id

        for key, value in record.__dict__.items():
            if key not in _RESERVED and not key.startswith("_"):
                payload[key] = _scrub(value)

        if record.exc_info:
            payload["error_class"] = record.exc_info[0].__name__ if record.exc_info[0] else None
            payload["stack"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


class TextFormatter(logging.Formatter):
    def __init__(self) -> None:
        super().__init__("%(asctime)s %(levelname)-8s %(name)s: %(message)s")


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if settings.log_json else TextFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())

    for noisy in ("uvicorn.access", "botocore", "boto3", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
