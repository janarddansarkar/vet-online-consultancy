"""appointment_status_booked_completed

Revision ID: c5e7a9b1d3f2
Revises: b8d2f4a6c1e9
Create Date: 2026-10-28 00:00:00.000000

Only two statuses remain: BOOKED (was PENDING/CONFIRMED) and COMPLETED. Cancelled requests are deleted,
along with pets left with no booking.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c5e7a9b1d3f2'
down_revision: Union[str, Sequence[str], None] = 'b8d2f4a6c1e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("DELETE FROM appointments WHERE status = 'CANCELLED'")
    op.execute("DELETE FROM pets WHERE id NOT IN (SELECT pet_id FROM appointments)")
    op.execute("CREATE TYPE appointment_status_new AS ENUM ('BOOKED', 'COMPLETED')")
    op.execute(
        "ALTER TABLE appointments ALTER COLUMN status TYPE appointment_status_new "
        "USING (CASE status::text WHEN 'COMPLETED' THEN 'COMPLETED' ELSE 'BOOKED' END)::appointment_status_new"
    )
    op.execute("DROP TYPE appointment_status")
    op.execute("ALTER TYPE appointment_status_new RENAME TO appointment_status")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("CREATE TYPE appointment_status_old AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')")
    op.execute(
        "ALTER TABLE appointments ALTER COLUMN status TYPE appointment_status_old "
        "USING (CASE status::text WHEN 'COMPLETED' THEN 'COMPLETED' ELSE 'PENDING' END)::appointment_status_old"
    )
    op.execute("DROP TYPE appointment_status")
    op.execute("ALTER TYPE appointment_status_old RENAME TO appointment_status")
