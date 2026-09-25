# Pithros — Development Services

Starts and stops the local PostgreSQL and Redis instances installed via scoop.

    .\scripts\dev-db.ps1 start
    .\scripts\dev-db.ps1 stop
    .\scripts\dev-db.ps1 status

PostgreSQL is started detached on purpose. Running `pg_ctl start` directly from a
shell ties the postmaster to that shell, and it dies when the shell exits.

Once running, the databases are:

    pithros        development
    pithros_test   test suite (rebuilt by pytest on each run)

Connection string (see `backend/.env.development`):

    postgresql+psycopg://pithros:pithros@localhost:5432/pithros
