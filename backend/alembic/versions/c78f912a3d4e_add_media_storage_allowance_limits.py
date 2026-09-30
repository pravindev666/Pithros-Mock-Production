"""add_media_storage_allowance_limits

Revision ID: c78f912a3d4e
Revises: be676895f24f
Create Date: 2026-09-30 12:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c78f912a3d4e'
down_revision: Union[str, Sequence[str], None] = 'be676895f24f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'subscription_entitlements',
        sa.Column('max_media_bytes', sa.BigInteger(), server_default=sa.text('1073741824'), nullable=False),
    )
    op.add_column(
        'subscription_entitlements',
        sa.Column('max_file_bytes', sa.BigInteger(), server_default=sa.text('10485760'), nullable=False),
    )


def downgrade() -> None:
    op.drop_column('subscription_entitlements', 'max_file_bytes')
    op.drop_column('subscription_entitlements', 'max_media_bytes')
