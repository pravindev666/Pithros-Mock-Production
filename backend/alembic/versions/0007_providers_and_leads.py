"""Farewell Network: providers, services, credential review and family leads

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-02 12:30:00.000000

Adds the provider domain and extends `memorial_media` so a media row belongs to
exactly one owner: a memorial or a provider.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0007'
down_revision: Union[str, Sequence[str], None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_PROVIDER_STATUSES = "('pending', 'approved', 'suspended', 'rejected')"
_VERIFICATION_STATES = (
    "('draft', 'submitted', 'verification_pending', 'verification_review', "
    "'approved', 'needs_more_information', 'rejected', 'appeal')"
)
_LEAD_STATUSES = (
    "('submitted', 'contacted', 'quoted', 'in_discussion', 'booked', "
    "'completed', 'cancelled')"
)


def upgrade() -> None:
    op.create_table(
        'providers',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('slug', sa.String(length=180), nullable=False),
        sa.Column('business_name', sa.String(length=200), nullable=False),
        sa.Column('contact_name', sa.String(length=200), nullable=False, server_default=''),
        sa.Column('tagline', sa.String(length=240), nullable=False, server_default=''),
        sa.Column('category', sa.String(length=80), nullable=False, server_default=''),
        sa.Column('city', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('service_areas', sa.Text(), nullable=False, server_default=''),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('phone', sa.String(length=40), nullable=False, server_default=''),
        sa.Column('whatsapp', sa.String(length=40), nullable=False, server_default=''),
        sa.Column('email', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('address', sa.String(length=300), nullable=False, server_default=''),
        sa.Column('operating_hours', sa.String(length=160), nullable=False, server_default=''),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column(
            'verification_state', sa.String(length=32), nullable=False, server_default='draft'
        ),
        sa.Column('status_reason', sa.Text(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('logo_media_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')
        ),
        sa.ForeignKeyConstraint(
            ['owner_user_id'],
            ['users.id'],
            name='fk_providers_owner_user_id_users',
            ondelete='CASCADE',
        ),
        sa.UniqueConstraint('slug', name='uq_providers_slug'),
        sa.CheckConstraint(f'status IN {_PROVIDER_STATUSES}', name='ck_providers_status_valid'),
        sa.CheckConstraint(
            f'verification_state IN {_VERIFICATION_STATES}',
            name='ck_providers_verification_state_valid',
        ),
    )
    op.create_index('ix_providers_owner_user_id', 'providers', ['owner_user_id'])
    op.create_index('ix_providers_status_city', 'providers', ['status', 'city'])
    op.create_index('ix_providers_status_category', 'providers', ['status', 'category'])

    # A media row now belongs to exactly one owner. Providers exist first so the
    # new foreign key has a target.
    op.alter_column(
        'memorial_media',
        'memorial_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.add_column(
        'memorial_media', sa.Column('provider_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_memorial_media_provider_id_providers',
        'memorial_media',
        'providers',
        ['provider_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_check_constraint(
        'ck_memorial_media_exactly_one_owner',
        'memorial_media',
        '(memorial_id IS NOT NULL AND provider_id IS NULL) '
        'OR (memorial_id IS NULL AND provider_id IS NOT NULL)',
    )
    op.create_index('ix_memorial_media_provider_status', 'memorial_media', ['provider_id', 'status'])

    op.create_table(
        'provider_services',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('price_note', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('estimated_time', sa.String(length=80), nullable=False, server_default=''),
        sa.Column('includes', sa.Text(), nullable=False, server_default=''),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('sort', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')
        ),
        sa.ForeignKeyConstraint(
            ['provider_id'],
            ['providers.id'],
            name='fk_provider_services_provider_id_providers',
            ondelete='CASCADE',
        ),
    )
    op.create_index(
        'ix_provider_services_provider', 'provider_services', ['provider_id', 'sort']
    )

    op.create_table(
        'provider_verifications',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('state', sa.String(length=32), nullable=False, server_default='draft'),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('decision_reason', sa.Text(), nullable=True),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')
        ),
        sa.ForeignKeyConstraint(
            ['provider_id'],
            ['providers.id'],
            name='fk_provider_verifications_provider_id_providers',
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['reviewed_by_id'],
            ['users.id'],
            name='fk_provider_verifications_reviewed_by_id_users',
            ondelete='SET NULL',
        ),
        sa.CheckConstraint(
            f'state IN {_VERIFICATION_STATES}',
            name='ck_provider_verifications_state_valid',
        ),
    )
    op.create_index(
        'ix_provider_verifications_provider',
        'provider_verifications',
        ['provider_id', 'created_at'],
    )
    op.create_index('ix_provider_verifications_state', 'provider_verifications', ['state'])

    op.create_table(
        'farewell_leads',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('family_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('memorial_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('contact_name', sa.String(length=200), nullable=False),
        sa.Column('contact_phone', sa.String(length=40), nullable=False),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('service_needed', sa.String(length=240), nullable=False),
        sa.Column('message', sa.Text(), nullable=False, server_default=''),
        sa.Column('date_needed', sa.String(length=40), nullable=True),
        sa.Column('urgency', sa.String(length=60), nullable=False, server_default=''),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='submitted'),
        sa.Column('quoted_amount', sa.String(length=120), nullable=True),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')
        ),
        sa.ForeignKeyConstraint(
            ['provider_id'],
            ['providers.id'],
            name='fk_farewell_leads_provider_id_providers',
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['service_id'],
            ['provider_services.id'],
            name='fk_farewell_leads_service_id_provider_services',
            ondelete='SET NULL',
        ),
        sa.ForeignKeyConstraint(
            ['family_user_id'],
            ['users.id'],
            name='fk_farewell_leads_family_user_id_users',
            ondelete='SET NULL',
        ),
        sa.ForeignKeyConstraint(
            ['memorial_id'],
            ['memorials.id'],
            name='fk_farewell_leads_memorial_id_memorials',
            ondelete='SET NULL',
        ),
        sa.CheckConstraint(
            f'status IN {_LEAD_STATUSES}', name='ck_farewell_leads_status_valid'
        ),
    )
    op.create_index('ix_farewell_leads_provider_id', 'farewell_leads', ['provider_id'])
    op.create_index(
        'ix_farewell_leads_provider_status',
        'farewell_leads',
        ['provider_id', 'status', 'created_at'],
    )


def downgrade() -> None:
    op.drop_index('ix_farewell_leads_provider_status', table_name='farewell_leads')
    op.drop_index('ix_farewell_leads_provider_id', table_name='farewell_leads')
    op.drop_table('farewell_leads')

    op.drop_index('ix_provider_verifications_state', table_name='provider_verifications')
    op.drop_index('ix_provider_verifications_provider', table_name='provider_verifications')
    op.drop_table('provider_verifications')

    op.drop_index('ix_provider_services_provider', table_name='provider_services')
    op.drop_table('provider_services')

    op.drop_index('ix_memorial_media_provider_status', table_name='memorial_media')
    op.drop_constraint(
        'ck_memorial_media_exactly_one_owner', 'memorial_media', type_='check'
    )
    op.drop_constraint(
        'fk_memorial_media_provider_id_providers', 'memorial_media', type_='foreignkey'
    )
    op.drop_column('memorial_media', 'provider_id')
    op.alter_column(
        'memorial_media',
        'memorial_id',
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    op.drop_index('ix_providers_status_category', table_name='providers')
    op.drop_index('ix_providers_status_city', table_name='providers')
    op.drop_index('ix_providers_owner_user_id', table_name='providers')
    op.drop_table('providers')
