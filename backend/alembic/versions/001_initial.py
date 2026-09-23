"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('user', 'admin', name='userrole'), nullable=False, server_default='user'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Lost items table
    op.create_table(
        'lost_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('category', sa.Enum('electronics', 'bags', 'wallets', 'id_cards', 'keys', 'books', 'clothing', 'accessories', 'documents', 'other', name='itemcategory'), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('identifying_features', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('lost_date', sa.Date(), nullable=False),
        sa.Column('lost_time', sa.Time(), nullable=True),
        sa.Column('status', sa.Enum('lost', 'found', 'potential_match', 'claim_pending', 'verified', 'returned', 'closed', name='itemstatus'), nullable=False, server_default='lost'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_lost_items_category', 'lost_items', ['category'])
    op.create_index('idx_lost_items_location', 'lost_items', ['location'])
    op.create_index('idx_lost_items_status', 'lost_items', ['status'])

    # Found items table
    op.create_table(
        'found_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('category', sa.Enum('electronics', 'bags', 'wallets', 'id_cards', 'keys', 'books', 'clothing', 'accessories', 'documents', 'other', name='itemcategory'), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('identifying_features', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('found_date', sa.Date(), nullable=False),
        sa.Column('found_time', sa.Time(), nullable=True),
        sa.Column('status', sa.Enum('lost', 'found', 'potential_match', 'claim_pending', 'verified', 'returned', 'closed', name='itemstatus'), nullable=False, server_default='found'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_found_items_category', 'found_items', ['category'])
    op.create_index('idx_found_items_location', 'found_items', ['location'])
    op.create_index('idx_found_items_status', 'found_items', ['status'])

    # Matches table
    op.create_table(
        'matches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lost_item_id', sa.Integer(), nullable=False),
        sa.Column('found_item_id', sa.Integer(), nullable=False),
        sa.Column('image_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('text_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('location_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('time_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('final_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('status', sa.Enum('pending', 'confirmed', 'rejected', name='matchstatus'), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['lost_item_id'], ['lost_items.id'], ),
        sa.ForeignKeyConstraint(['found_item_id'], ['found_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_matches_lost_item', 'matches', ['lost_item_id'])
    op.create_index('idx_matches_found_item', 'matches', ['found_item_id'])

    # Claims table
    op.create_table(
        'claims',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('match_id', sa.Integer(), nullable=False),
        sa.Column('claimant_id', sa.Integer(), nullable=False),
        sa.Column('verification_question', sa.Text(), nullable=False),
        sa.Column('verification_answer', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'verified', 'rejected', name='claimstatus'), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['claimant_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_claims_match', 'claims', ['match_id'])

    # Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('match_found', 'claim_submitted', 'claim_approved', 'claim_rejected', 'item_returned', name='notificationtype'), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_notifications_user', 'notifications', ['user_id'])


def downgrade():
    op.drop_index('idx_notifications_user', table_name='notifications')
    op.drop_table('notifications')
    op.drop_index('idx_claims_match', table_name='claims')
    op.drop_table('claims')
    op.drop_index('idx_matches_found_item', table_name='matches')
    op.drop_index('idx_matches_lost_item', table_name='matches')
    op.drop_table('matches')
    op.drop_index('idx_found_items_status', table_name='found_items')
    op.drop_index('idx_found_items_location', table_name='found_items')
    op.drop_index('idx_found_items_category', table_name='found_items')
    op.drop_table('found_items')
    op.drop_index('idx_lost_items_status', table_name='lost_items')
    op.drop_index('idx_lost_items_location', table_name='lost_items')
    op.drop_index('idx_lost_items_category', table_name='lost_items')
    op.drop_table('lost_items')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.execute('DROP TYPE userrole')
    op.execute('DROP TYPE itemcategory')
    op.execute('DROP TYPE itemstatus')
    op.execute('DROP TYPE matchstatus')
    op.execute('DROP TYPE claimstatus')
    op.execute('DROP TYPE notificationtype')