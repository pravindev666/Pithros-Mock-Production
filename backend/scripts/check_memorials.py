from sqlalchemy import text

from app.core.database import engine

with engine.connect() as conn:
    cols = conn.execute(
        text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
    ).fetchall()
    print("USER COLS:", [c[0] for c in cols])
    u = conn.execute(
        text(
            "SELECT id, email, role, firebase_uid, created_at FROM users "
            "WHERE id = '5ce5fa91-d132-431d-a2cb-2b441fe9e5ea'"
        )
    ).fetchall()
    print("USER:", u)
