"""memorial identity columns

Revision ID: 0004
Revises: f345c678b901
Create Date: 2026-10-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, Sequence[str], None] = 'f345c678b901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'memorials',
        sa.Column('duplicate_held', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )
    op.add_column(
        'memorials',
        sa.Column('dispute_status', sa.String(length=32), nullable=True),
    )
    op.add_column(
        'memorials',
        sa.Column('merged_into_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_memorials_merged_into_id_memorials',
        'memorials',
        'memorials',
        ['merged_into_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_memorials_merged_into_id_memorials', 'memorials', type_='foreignkey')
    op.drop_column('memorials', 'merged_into_id')
    op.drop_column('memorials', 'dispute_status')
    op.drop_column('memorials', 'duplicate_held')
