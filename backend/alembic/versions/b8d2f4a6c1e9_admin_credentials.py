"""admin_credentials

Revision ID: b8d2f4a6c1e9
Revises: a3c7e1f5d9b6
Create Date: 2026-10-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b8d2f4a6c1e9'
down_revision: Union[str, Sequence[str], None] = 'a3c7e1f5d9b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'admin_credentials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('admin_credentials')
