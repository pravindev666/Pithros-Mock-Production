"""The audit trail is readable by admins only, and shows what really happened."""

from __future__ import annotations


def test_admin_can_list_the_audit_trail(client, db_session, make_user, auth):
    admin = make_user(name="Auditor", role="admin")
    admin.admin_subrole = "admin"
    db_session.flush()

    from app.audit.service import record
    from app.core.enums import AuditAction

    record(
        db_session,
        action=AuditAction.ADMIN_LOGIN,
        entity="user",
        entity_id=admin.id,
        actor=admin,
    )
    db_session.flush()

    response = client.get("/api/v1/admin/audit", headers=auth(admin))

    assert response.status_code == 200, response.text
    assert any(row["action"] == "ADMIN_LOGIN" for row in response.json())
    assert "X-Has-More" in response.headers


def test_non_admin_cannot_read_the_audit_trail(client, make_user, auth):
    visitor = make_user(name="Visitor")
    assert client.get("/api/v1/admin/audit", headers=auth(visitor)).status_code == 403
