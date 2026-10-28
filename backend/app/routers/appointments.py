from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.capacity import ensure_booking_capacity
from app.database import get_db
from app.deps import get_current_user
from app.models import (
    Appointment,
    AppointmentStatus,
    Pet,
    User,
)
from app.schemas import AppointmentCreateRequest, AppointmentOut

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Appointment:
    ensure_booking_capacity(db)
    pet = db.get(Pet, payload.pet_id)
    if pet is None or pet.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")

    # Optional even for home visits: owners can share their location on WhatsApp instead.
    home_visit_address = None
    if payload.home_visit_required:
        home_visit_address = (payload.home_visit_address or "").strip() or None

    # No time is chosen at booking; Dr. Sarkar contacts the owner to arrange the consultation.
    appointment = Appointment(
        pet_id=pet.id,
        symptoms=payload.symptoms.strip(),
        contact_name=payload.contact_name.strip(),
        contact_phone=payload.contact_phone.strip(),
        home_visit_required=payload.home_visit_required,
        home_visit_address=home_visit_address,
        status=AppointmentStatus.PENDING,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment
