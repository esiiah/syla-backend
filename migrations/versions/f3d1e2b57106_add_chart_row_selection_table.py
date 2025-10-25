"""Add chart row selection table

Revision ID: f3d1e2b57106
Revises: 6d56f28d1b12
Create Date: 2025-10-25 12:16:41.456148

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f3d1e2b57106'
down_revision: Union[str, Sequence[str], None] = 'create_notifications_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create chart_templates table
    op.create_table('chart_templates',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('category', sa.String(length=50), nullable=False),
    sa.Column('settings', sa.Text(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('preview_image', sa.String(length=255), nullable=True),
    sa.Column('is_featured', sa.Boolean(), nullable=True),
    sa.Column('usage_count', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chart_templates_category'), 'chart_templates', ['category'], unique=False)
    op.create_index(op.f('ix_chart_templates_id'), 'chart_templates', ['id'], unique=False)
    op.create_index(op.f('ix_chart_templates_is_featured'), 'chart_templates', ['is_featured'], unique=False)
    op.create_index(op.f('ix_chart_templates_name'), 'chart_templates', ['name'], unique=True)
    
    # Create chart_row_selections table
    op.create_table('chart_row_selections',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('chart_id', sa.String(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('selected_row_indices', sa.JSON(), nullable=False),
    sa.Column('selection_mode', sa.String(), nullable=True),
    sa.Column('sort_column', sa.String(), nullable=True),
    sa.Column('sort_direction', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chart_row_selections_chart_id'), 'chart_row_selections', ['chart_id'], unique=False)
    op.create_index(op.f('ix_chart_row_selections_id'), 'chart_row_selections', ['id'], unique=False)
    
    # Create chart_settings table
    op.create_table('chart_settings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('settings', sa.Text(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('is_public', sa.Boolean(), nullable=True),
    sa.Column('tags', sa.Text(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chart_settings_id'), 'chart_settings', ['id'], unique=False)
    op.create_index(op.f('ix_chart_settings_is_public'), 'chart_settings', ['is_public'], unique=False)
    op.create_index(op.f('ix_chart_settings_name'), 'chart_settings', ['name'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_chart_settings_name'), table_name='chart_settings')
    op.drop_index(op.f('ix_chart_settings_is_public'), table_name='chart_settings')
    op.drop_index(op.f('ix_chart_settings_id'), table_name='chart_settings')
    op.drop_table('chart_settings')
    op.drop_index(op.f('ix_chart_row_selections_id'), table_name='chart_row_selections')
    op.drop_index(op.f('ix_chart_row_selections_chart_id'), table_name='chart_row_selections')
    op.drop_table('chart_row_selections')
    op.drop_index(op.f('ix_chart_templates_name'), table_name='chart_templates')
    op.drop_index(op.f('ix_chart_templates_is_featured'), table_name='chart_templates')
    op.drop_index(op.f('ix_chart_templates_id'), table_name='chart_templates')
    op.drop_index(op.f('ix_chart_templates_category'), table_name='chart_templates')
    op.drop_table('chart_templates')
    # ### end Alembic commands ###
