"""Shared Pydantic base classes.

Responses use camelCase aliases so the JSON matches the existing frontend
contract exactly — wiring the client required no view changes as a result.

`StrictModel` rejects unknown fields rather than silently dropping them. That is
what makes it impossible for a client to smuggle ownership or status fields into
a create call and have them quietly ignored.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(word.capitalize() for word in tail)


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class StrictModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )
