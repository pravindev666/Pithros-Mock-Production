"""add_abuse_and_audio_file_limits

Revision ID: e234b567a890
Revises: c78f912a3d4e
Create Date: 2026-09-30 12:48:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e234b567a890'
down_revision: Union[str, Sequence[str], None] = 'c78f912a3d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'subscription_entitlements',
        sa.Column('max_audio_file_bytes', sa.BigInteger(), server_default=sa.text('52428800'), nullable=False),
    )
    op.add_column(
        'subscription_entitlements',
        sa.Column('max_timeline_events', sa.Integer(), server_default=sa.text('50'), nullable=False),
    )
    op.add_column(
        'subscription_entitlements',
        sa.Column('max_daily_upload_attempts', sa.Integer(), server_default=sa.text('50'), nullable=False),
    )


def downgrade() -> None:
    op.drop_column('subscription_entitlements', 'max_daily_upload_attempts')
    op.drop_column('subscription_entitlements', 'max_timeline_events')
    op.drop_column('subscription_entitlements', 'max_audio_file_bytes')
