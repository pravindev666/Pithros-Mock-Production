"""Account deletion lifecycle and memorial dispositions

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-02 15:00:00.000000

Adds the data-lifecycle tables behind PRD §18–§24. Kept separate from billing:
the deletion state machine and the payment state machine never share a status.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0008'
down_revision: Union[str, Sequence[str], None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DELETION_STATUSES = (
    "('REQUESTED', 'VERIFIED', 'SCHEDULED', 'EXECUTING', 'COMPLETED', "
    "'BLOCKED_BY_DISPOSITION', 'LEGAL_HOLD', 'REJECTED_WITH_REASON', 'CANCELLED')"
)
_DISPOSITIONS = "('transfer', 'delete', 'orphan')"
_DISPOSITION_STATUSES = "('pending', 'completed')"


def upgrade() -> None:
    op.create_table(
        'account_deletion_requests',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='REQUESTED'),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column(
            'requested_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('now()'),
        ),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=True),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('now()'),
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('now()'),
        ),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            name='fk_account_deletion_requests_user_id_users',
            ondelete='CASCADE',
        ),
        sa.CheckConstraint(
            f'status IN {_DELETION_STATUSES}', name='ck_account_deletion_requests_status_valid'
        ),
    )
    op.create_index(
        'ix_account_deletion_user_status',
        'account_deletion_requests',
        ['user_id', 'status'],
    )
    op.create_index(
        'ix_account_deletion_requests_user_id', 'account_deletion_requests', ['user_id']
    )

    op.create_table(
        'memorial_dispositions',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column('deletion_request_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('memorial_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('disposition', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('successor_email', sa.String(length=320), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('now()'),
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('now()'),
        ),
        sa.ForeignKeyConstraint(
            ['deletion_request_id'],
            ['account_deletion_requests.id'],
            name='fk_memorial_dispositions_request',
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['memorial_id'],
            ['memorials.id'],
            name='fk_memorial_dispositions_memorial_id_memorials',
            ondelete='CASCADE',
        ),
        sa.UniqueConstraint(
            'deletion_request_id',
            'memorial_id',
            name='uq_memorial_disposition_request_memorial',
        ),
        sa.CheckConstraint(
            f'disposition IN {_DISPOSITIONS}', name='ck_memorial_dispositions_disposition_valid'
        ),
        sa.CheckConstraint(
            f'status IN {_DISPOSITION_STATUSES}', name='ck_memorial_dispositions_status_valid'
        ),
    )
    op.create_index(
        'ix_memorial_dispositions_deletion_request_id',
        'memorial_dispositions',
        ['deletion_request_id'],
    )
    op.create_index(
        'ix_memorial_dispositions_memorial_id', 'memorial_dispositions', ['memorial_id']
    )


def downgrade() -> None:
    op.drop_index('ix_memorial_dispositions_memorial_id', table_name='memorial_dispositions')
    op.drop_index(
        'ix_memorial_dispositions_deletion_request_id', table_name='memorial_dispositions'
    )
    op.drop_table('memorial_dispositions')

    op.drop_index(
        'ix_account_deletion_requests_user_id', table_name='account_deletion_requests'
    )
    op.drop_index('ix_account_deletion_user_status', table_name='account_deletion_requests')
    op.drop_table('account_deletion_requests')
