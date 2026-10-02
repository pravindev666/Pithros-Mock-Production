"""Account constants for the E2E suite.

The mission designates this exact address as the primary test user. If a
previous run left the account in Firebase, the harness deletes only this one
account to guarantee a clean signup journey — no other account is ever touched.
"""

from __future__ import annotations

from dataclasses import dataclass

TEST_STEWARD_EMAIL = "mathew60666@GMAIL.COM"


@dataclass(frozen=True)
class TestCredentials:
    """A credential pair whose repr is redacted.

    Pytest prints fixture values when a test errors; without this, the generated
    password would end up in the run output.
    """

    email: str
    password: str

    # Keep pytest from trying to collect this helper as a test class.
    __test__ = False

    def __repr__(self) -> str:
        return f"TestCredentials(email={self.email!r}, password=<redacted>)"
