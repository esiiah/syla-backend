"""Create notifications table migration

Revision ID: create_notifications_table
Revises: fa977aade8fc
Create Date: 2025-10-14

Save this file as: migrations/versions/[timestamp]_create_notifications_table.py
Then run: alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'create_notifications_table'
down_revision = 'fa977aade8fc'  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False, server_default='info'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('category', sa.String(), nullable=False, server_default='system'),
        sa.Column('priority', sa.String(), nullable=False, server_default='medium'),
        sa.Column('read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('action_url', sa.String(512), nullable=True),
        sa.Column('meta_info', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_notifications_id', 'notifications', ['id'])
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('ix_notifications_read', 'notifications', ['read'])
    op.create_index('ix_notifications_archived', 'notifications', ['archived'])
    
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_notifications_user_id',
        'notifications',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    op.drop_constraint('fk_notifications_user_id', 'notifications', type_='foreignkey')
    op.drop_index('ix_notifications_archived', table_name='notifications')
    op.drop_index('ix_notifications_read', table_name='notifications')
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_index('ix_notifications_id', table_name='notifications')
    op.drop_table('notifications')
