from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Appointment


def appointment_count(db: Session) -> int:
    return db.query(Appointment).count()


def ensure_booking_capacity(db: Session) -> None:
    if appointment_count(db) >= settings.max_appointments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bookings are temporarily full. Please contact Dr. Sarkar on WhatsApp to arrange a consultation.",
        )
