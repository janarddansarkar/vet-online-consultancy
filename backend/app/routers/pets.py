from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.capacity import ensure_booking_capacity
from app.database import get_db
from app.deps import get_current_user
from app.models import Pet, User
from app.schemas import PetCreateRequest, PetOut

router = APIRouter(prefix="/api/pets", tags=["pets"])


@router.post("", response_model=PetOut, status_code=status.HTTP_201_CREATED)
def create_pet(
    payload: PetCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Pet:
    # Checked here too, so a full site doesn't leave behind pets with no booking.
    ensure_booking_capacity(db)
    pet = Pet(owner_id=current_user.id, **payload.model_dump())
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet
