"""Regression: refusal audits must never block on the caller's own row lock.

The bug (observed live): `record_independently` opened a *second* connection while
the request's own session still held an uncommitted lock on the actor's `users`
row (written while resolving the token: last-seen / profile flush). The audit's
`audit_logs` foreign-key check then needed `FOR KEY SHARE` on that same row and
waited on the caller's own transaction until the statement timeout — pinning the
worker for minutes and leaving `/health` unresponsive.

These tests pin the fix: inside a request the refusal audit is deferred until the
session (and its locks) has closed, and outside a request a held lock is bounded.
"""

from __future__ import annotations

import time
import uuid

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.audit.models import AuditLog
from app.audit.service import record_independently, write_deferred_audits
from app.core.enums import AuditAction, AuditResult
from app.users.models import User


def _committed_user(engine) -> uuid.UUID:
    unique = uuid.uuid4().hex[:10]
    with Session(bind=engine) as session:
        user = User(
            firebase_uid=f"uid_{unique}",
            email=f"{unique}@example.com",
            name="Lock Person",
            role="visitor",
            email_verified=True,
        )
        session.add(user)
        session.commit()
        return user.id


def _cleanup(engine, user_id: uuid.UUID) -> None:
    with engine.begin() as conn:
        conn.execute(delete(AuditLog).where(AuditLog.entity_id == str(user_id)))
        conn.execute(delete(User).where(User.id == user_id))


def test_refusal_audit_defers_and_never_waits_on_the_request_lock(engine):
    user_id = _committed_user(engine)
    queue: list = []
    try:
        db = Session(bind=engine)
        db.info["_pithros_request_session"] = True
        try:
            user = db.get(User, user_id)
            # Mirror the real request: the token-resolution flush holds this lock.
            db.execute(text("SELECT 1 FROM users WHERE id = :i FOR NO KEY UPDATE"), {"i": user_id})

            started = time.perf_counter()
            record_independently(
                action=AuditAction.AUTHORIZATION_DENIED,
                entity="user",
                entity_id=user_id,
                actor=user,
                result=AuditResult.DENIED,
            )
            elapsed = time.perf_counter() - started

            assert elapsed < 1.0, "the refusal audit waited on the caller's own lock"
            queue = db.info.get("_pithros_audit_queue", [])
            assert len(queue) == 1, "the refusal audit was not deferred"
        finally:
            db.rollback()
            db.close()

        # After the session (and its locks) is closed, the audit is written.
        write_deferred_audits(queue)
        with Session(bind=engine) as session:
            stored = session.scalar(select(AuditLog).where(AuditLog.entity_id == str(user_id)))
        assert stored is not None, "the deferred refusal audit was never written"
        assert stored.actor_id == user_id
        assert stored.action == AuditAction.AUTHORIZATION_DENIED.value
    finally:
        _cleanup(engine, user_id)


def test_immediate_audit_is_bounded_when_the_actor_row_is_locked(engine):
    """Outside a request the write is immediate, and a held lock is bounded, not fatal."""
    user_id = _committed_user(engine)
    blocker = Session(bind=engine)
    try:
        with Session(bind=engine) as session:
            user = session.get(User, user_id)
        # A different transaction holds a conflicting write lock on the actor row.
        blocker.execute(text("SELECT 1 FROM users WHERE id = :i FOR UPDATE"), {"i": user_id})

        started = time.perf_counter()
        record_independently(
            action=AuditAction.AUTHORIZATION_DENIED,
            entity="user",
            entity_id=user_id,
            actor=user,
            result=AuditResult.DENIED,
        )
        elapsed = time.perf_counter() - started

        assert elapsed < 8.0, f"the immediate audit waited too long ({elapsed:.1f}s)"
        with Session(bind=engine) as session:
            stored = session.scalar(select(AuditLog).where(AuditLog.entity_id == str(user_id)))
        assert stored is not None, "the audit was dropped instead of falling back"
        # The fallback drops the actor reference so it no longer needs the lock.
        assert stored.actor_id is None
    finally:
        blocker.rollback()
        blocker.close()
        _cleanup(engine, user_id)
