"""FastAPI dependencies that turn a bearer token into an authorised Pithros user.

`get_token_verifier` is the seam the test suite overrides, which is what lets the
full authorization matrix run without Firebase credentials.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.firebase import TokenVerifier, get_firebase_verifier
from app.auth.service import resolve_or_provision_user
from app.core.database import get_db
from app.core.enums import AdminSubRole, UserRole
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.logging import user_id_var
from app.users.models import User

bearer_scheme = HTTPBearer(auto_error=False, description="Firebase ID token")


def get_token_verifier() -> TokenVerifier:
    return get_firebase_verifier()


def get_optional_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
    verifier: Annotated[TokenVerifier, Depends(get_token_verifier)],
) -> User | None:
    """Resolve the caller when a token is present; return None for anonymous requests."""
    if credentials is None or not credentials.credentials:
        return None

    identity = verifier.verify(credentials.credentials)
    user = resolve_or_provision_user(db, identity)

    request.state.user_id = str(user.id)
    user_id_var.set(str(user.id))
    return user


def get_current_user(
    user: Annotated[User | None, Depends(get_optional_user)],
) -> User:
    if user is None:
        raise UnauthorizedError("Authentication required.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def require_authenticated_user() -> Callable[..., User]:
    """Alias of `get_current_user` for readers who prefer an explicit name."""

    def dependency(user: CurrentUser) -> User:
        return user

    return dependency


def require_role(*roles: UserRole) -> Callable[..., User]:
    allowed = {role.value for role in roles}

    def dependency(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise ForbiddenError("You do not have access to this resource.")
        return user

    return dependency


def require_admin_role(*subroles: AdminSubRole) -> Callable[..., User]:
    """Admin-only gate. A super admin satisfies every subrole requirement."""

    def dependency(user: Annotated[User, Depends(require_role(UserRole.ADMIN))]) -> User:
        if not subroles:
            return user
        if user.admin_subrole == AdminSubRole.SUPER_ADMIN.value:
            return user
        if user.admin_subrole not in {subrole.value for subrole in subroles}:
            raise ForbiddenError("Your administrator role does not permit this action.")
        return user

    return dependency
