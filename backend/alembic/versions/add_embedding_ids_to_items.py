"""add embedding ids to items

Revision ID: add_embedding_ids_to_items
Revises: 
Create Date: 2026-09-23 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_embedding_ids_to_items'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('lost_items', sa.Column('text_embedding_id', sa.Integer(), nullable=True))
    op.add_column('lost_items', sa.Column('image_embedding_id', sa.Integer(), nullable=True))
    op.add_column('found_items', sa.Column('text_embedding_id', sa.Integer(), nullable=True))
    op.add_column('found_items', sa.Column('image_embedding_id', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('found_items', 'image_embedding_id')
    op.drop_column('found_items', 'text_embedding_id')
    op.drop_column('lost_items', 'image_embedding_id')
    op.drop_column('lost_items', 'text_embedding_id')