"""SQLAlchemy engine, session factory, and declarative base."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def _engine_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {"pool_pre_ping": True, "future": True, "echo": settings.database_echo}
    if settings.database_url.startswith("sqlite"):
        return kwargs
    kwargs["pool_size"] = settings.database_pool_size
    kwargs["max_overflow"] = settings.database_max_overflow
    return kwargs


engine = create_engine(settings.database_url, **_engine_kwargs())

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def transaction(db: Session) -> Iterator[Session]:
    """Run a unit of work atomically.

    Services own their transactions so multi-step operations — creating a
    memorial and its steward, moving stewardship, recording a verification
    decision — cannot half-apply.
    """
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
