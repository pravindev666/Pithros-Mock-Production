"""Keyset (cursor) pagination.

Offset paging skips and duplicates rows when a list is being written to between
pages — which is exactly the case for tributes, offerings and media on a public
memorial. Keyset paging compares against the last row seen instead of counting, so
it stays stable.

Cursor = base64(`<iso8601 created_at>|<uuid>`). Ordering is always
`(created_at, id)` in a consistent direction, which gives a total order even when
timestamps collide.

Two response shapes are supported deliberately:

* Memorial-domain lists keep returning a plain array, because
  `src/services/api.ts` types the live client as `typeof demoApi` and every view
  consumes arrays. Page metadata travels in response headers instead. Changing the
  body would break that contract and force view changes.
* `PageEnvelope` exists for admin and notification endpoints, whose UIs are
  rewritten in a later phase and so have no contract to preserve.
"""

from __future__ import annotations

import base64
import binascii
import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any

from fastapi import Query, Response
from sqlalchemy import Select, tuple_
from sqlalchemy.orm import Session

from app.core.errors import ValidationError

DEFAULT_LIMIT = 20
MAX_LIMIT = 100

NEXT_CURSOR_HEADER = "X-Next-Cursor"
HAS_MORE_HEADER = "X-Has-More"


@dataclass(frozen=True)
class Cursor:
    created_at: datetime
    id: uuid.UUID

    def encode(self) -> str:
        raw = f"{self.created_at.isoformat()}|{self.id}"
        return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")

    @classmethod
    def decode(cls, value: str) -> Cursor:
        try:
            padded = value + "=" * (-len(value) % 4)
            raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
            created_at_raw, id_raw = raw.split("|", 1)
            return cls(created_at=datetime.fromisoformat(created_at_raw), id=uuid.UUID(id_raw))
        except (ValueError, UnicodeDecodeError, binascii.Error) as exc:
            raise ValidationError("The pagination cursor is not valid.") from exc


@dataclass(frozen=True)
class PageParams:
    limit: int
    cursor: Cursor | None

    # No validation here on purpose. MAX_LIMIT is a ceiling on what a *client* may
    # request, enforced by the Query(le=MAX_LIMIT) on the route parameter. Internal
    # callers — the memorial projections embed 200 tributes / 300 media — legitimately
    # page larger than that, and an invariant check here would reject them.


def page_params(
    limit: Annotated[int, Query(ge=1, le=MAX_LIMIT)] = DEFAULT_LIMIT,
    cursor: Annotated[str | None, Query(max_length=256)] = None,
) -> PageParams:
    return PageParams(limit=limit, cursor=Cursor.decode(cursor) if cursor else None)


@dataclass(frozen=True)
class Page:
    items: list[Any]
    next_cursor: str | None
    has_more: bool


def paginate(
    db: Session,
    stmt: Select,
    *,
    model: Any,
    params: PageParams,
    order_field: str = "created_at",
    descending: bool = True,
) -> Page:
    """Apply the cursor and a limit, fetching one extra row to detect `has_more`.

    `order_field` is any timestamp column on the model. The cursor still carries a
    single datetime; ties are broken by id, which makes the ordering total.
    """
    column = getattr(model, order_field)
    order = column.desc() if descending else column.asc()
    id_order = model.id.desc() if descending else model.id.asc()

    if params.cursor is not None:
        boundary = tuple_(column, model.id)
        target = tuple_(params.cursor.created_at, params.cursor.id)
        stmt = stmt.where(boundary < target if descending else boundary > target)

    stmt = stmt.order_by(order, id_order).limit(params.limit + 1)
    rows: Sequence[Any] = list(db.scalars(stmt).unique())

    has_more = len(rows) > params.limit
    items = list(rows[: params.limit])

    next_cursor = None
    if has_more and items:
        last = items[-1]
        next_cursor = Cursor(created_at=getattr(last, order_field), id=last.id).encode()

    return Page(items=items, next_cursor=next_cursor, has_more=has_more)


def apply_page_headers(response: Response, page: Page) -> None:
    """Carry page metadata alongside an array body, preserving the array contract."""
    response.headers[HAS_MORE_HEADER] = "true" if page.has_more else "false"
    if page.next_cursor:
        response.headers[NEXT_CURSOR_HEADER] = page.next_cursor


__all__ = [
    "DEFAULT_LIMIT",
    "HAS_MORE_HEADER",
    "MAX_LIMIT",
    "NEXT_CURSOR_HEADER",
    "Cursor",
    "Page",
    "PageParams",
    "apply_page_headers",
    "page_params",
    "paginate",
]
