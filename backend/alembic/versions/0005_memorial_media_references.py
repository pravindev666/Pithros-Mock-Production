"""memorial media references

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-02 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0005'
down_revision: Union[str, Sequence[str], None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'memorials',
        sa.Column('portrait_media_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        'memorials',
        sa.Column('cover_media_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_memorials_portrait_media_id_memorial_media',
        'memorials',
        'memorial_media',
        ['portrait_media_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_memorials_cover_media_id_memorial_media',
        'memorials',
        'memorial_media',
        ['cover_media_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_memorials_cover_media_id_memorial_media', 'memorials', type_='foreignkey'
    )
    op.drop_constraint(
        'fk_memorials_portrait_media_id_memorial_media', 'memorials', type_='foreignkey'
    )
    op.drop_column('memorials', 'cover_media_id')
    op.drop_column('memorials', 'portrait_media_id')
