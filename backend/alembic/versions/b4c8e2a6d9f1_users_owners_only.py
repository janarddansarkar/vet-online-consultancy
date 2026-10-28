"""users_owners_only

The users table now holds only pet owners: drop the role column and the doctor's row. The doctor
doesn't sign in (the admin dashboard has no login) and reminder emails go to DOCTOR_EMAIL.

Revision ID: b4c8e2a6d9f1
Revises: a7d3e9f2b5c8
Create Date: 2026-09-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b4c8e2a6d9f1'
down_revision: Union[str, Sequence[str], None] = 'a7d3e9f2b5c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('appointments_cancelled_by_user_id_fkey', 'appointments', type_='foreignkey')
    op.drop_column('appointments', 'cancelled_by_user_id')
    op.execute("DELETE FROM users WHERE role <> 'OWNER'")
    op.drop_index(op.f('ix_users_role'), table_name='users')
    op.drop_column('users', 'role')
    postgresql.ENUM(name='user_role').drop(op.get_bind())


def downgrade() -> None:
    """Downgrade schema."""
    user_role = postgresql.ENUM('OWNER', 'VET', 'ADMIN', name='user_role')
    user_role.create(op.get_bind())
    op.add_column('users', sa.Column('role', user_role, server_default='OWNER', nullable=False))
    op.alter_column('users', 'role', server_default=None)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    op.execute("""
        INSERT INTO users (id, email, full_name, role, is_active)
        VALUES (gen_random_uuid(), 'doctor@example.com', 'Dr. Nituporna Sarkar', 'ADMIN', true)
    """)
    op.add_column('appointments', sa.Column('cancelled_by_user_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'appointments_cancelled_by_user_id_fkey', 'appointments', 'users',
        ['cancelled_by_user_id'], ['id'], ondelete='SET NULL',
    )
