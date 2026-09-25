"""Application configuration, loaded from environment-specific .env files."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]

Environment = Literal["development", "test", "production"]

_DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"


def _resolve_env_files() -> tuple[Path, ...]:
    """Environment files, in increasing order of precedence.

    `.env.{environment}` is committed and holds non-secret development defaults.
    `.env.local` is gitignored and holds real credentials — database passwords,
    service-account paths. Keeping them in separate files is what stops a real
    password from being committed by accident.
    """
    environment = os.getenv("ENVIRONMENT", "development")

    files: list[Path] = []
    committed = BACKEND_DIR / f".env.{environment}"
    if committed.exists():
        files.append(committed)
    elif (BACKEND_DIR / ".env").exists():
        files.append(BACKEND_DIR / ".env")

    # Loaded last, so it overrides the committed defaults.
    local_override = BACKEND_DIR / ".env.local"
    if local_override.exists():
        files.append(local_override)

    return tuple(files)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_resolve_env_files(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: Environment = "development"
    debug: bool = False
    demo_mode: bool = False

    app_base_url: str = "http://localhost:8000"
    frontend_base_url: str = "http://localhost:3000"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg://pithros:pithros@localhost:5432/pithros"
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10

    redis_url: str = "redis://localhost:6379/0"

    firebase_project_id: str = ""
    firebase_client_email: str = ""
    firebase_private_key: str = ""
    firebase_service_account_file: str = ""

    r2_endpoint_url: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_region: str = "auto"
    r2_bucket_public: str = "pithros-public"
    r2_bucket_private: str = "pithros-private"
    r2_bucket_sensitive: str = "pithros-sensitive"
    r2_public_base_url: str = ""
    r2_presign_expiry_seconds: int = 900

    # "s3" targets Cloudflare R2 (or any S3-compatible service).
    # "local" writes to disk under the backend and is refused in production.
    storage_backend: Literal["s3", "local"] = "s3"
    local_storage_path: str = "var/media"
    # Signs development-only storage URLs. Unused in production, where storage
    # must be S3 and this value is never consulted.
    local_storage_secret: str = "pithros-dev-storage-secret"  # noqa: S105

    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    cashfree_app_id: str = ""
    cashfree_secret_key: str = ""
    cashfree_webhook_secret: str = ""

    cors_origins: str = _DEFAULT_CORS_ORIGINS

    rate_limit_enabled: bool = True
    idempotency_enabled: bool = True
    celery_task_always_eager: bool = False

    max_upload_bytes: int = 25 * 1024 * 1024
    log_level: str = "INFO"
    log_json: bool = True

    invite_token_ttl_hours: int = Field(default=168, ge=1)

    @model_validator(mode="after")
    def _unescape_private_key(self) -> Settings:
        if self.firebase_private_key and "\\n" in self.firebase_private_key:
            self.firebase_private_key = self.firebase_private_key.replace("\\n", "\n")
        return self

    @model_validator(mode="after")
    def _guard_production(self) -> Settings:
        if self.environment != "production":
            return self

        problems: list[str] = []
        if self.demo_mode:
            problems.append("DEMO_MODE must be false in production")
        if "*" in self.cors_origins_list:
            problems.append("CORS_ORIGINS must not contain a wildcard in production")
        if self.storage_backend != "s3":
            problems.append("STORAGE_BACKEND must be 's3' in production")
        if not self.firebase_project_id:
            problems.append("FIREBASE_PROJECT_ID is required in production")
        if not (
            self.firebase_service_account_file
            or (self.firebase_client_email and self.firebase_private_key)
        ):
            problems.append("Firebase credentials are required in production")

        if problems:
            raise ValueError("Invalid production configuration: " + "; ".join(problems))
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def has_storage_credentials(self) -> bool:
        if self.storage_backend == "local":
            return True
        return bool(self.r2_endpoint_url and self.r2_access_key_id and self.r2_secret_access_key)

    @property
    def has_firebase_credentials(self) -> bool:
        return bool(
            self.firebase_service_account_file
            or (
                self.firebase_project_id
                and self.firebase_client_email
                and self.firebase_private_key
            )
        )

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
