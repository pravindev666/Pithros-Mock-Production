"""add_expanded_memorial_themes

Revision ID: f345c678b901
Revises: e234b567a890
Create Date: 2026-09-30 13:46:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f345c678b901'
down_revision: Union[str, Sequence[str], None] = 'e234b567a890'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing check constraint and recreate with new themes
    op.drop_constraint(op.f("ck_memorials_theme_valid"), "memorials", type_="check")
    op.create_check_constraint(
        op.f("ck_memorials_theme_valid"),
        "memorials",
        "theme IN ('classic', 'ivory', 'midnight', 'heritage', 'garden', 'monument', 'horizon', 'candlelight')",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_memorials_theme_valid"), "memorials", type_="check")
    op.create_check_constraint(
        op.f("ck_memorials_theme_valid"),
        "memorials",
        "theme IN ('classic', 'garden', 'horizon', 'candlelight', 'heritage')",
    )
