import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

from app.models import AppointmentStatus, PetGender


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: str | None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=2000)
    password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str


class GoogleAuthRequest(BaseModel):
    credential: str


class AdminLoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Pets
# ---------------------------------------------------------------------------


class PetCreateRequest(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    species: str = Field(min_length=1, max_length=100)
    breed: str | None = Field(default=None, max_length=100)
    gender: PetGender = PetGender.UNKNOWN
    date_of_birth: date | None = None
    weight_kg: Decimal | None = None
    allergies: str | None = None
    current_medications: str | None = None
    medical_history: str | None = None


class PetOut(BaseModel):
    id: uuid.UUID
    name: str | None
    species: str
    breed: str | None
    gender: PetGender
    date_of_birth: date | None
    weight_kg: Decimal | None
    allergies: str | None
    current_medications: str | None
    medical_history: str | None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------


class AppointmentCreateRequest(BaseModel):
    pet_id: uuid.UUID
    symptoms: str = Field(min_length=1, max_length=2000)
    contact_name: str = Field(min_length=1, max_length=200)
    contact_phone: str = Field(min_length=7, max_length=30)
    home_visit_required: bool = False
    home_visit_address: str | None = Field(default=None, max_length=1000)


class AppointmentOut(BaseModel):
    id: uuid.UUID
    pet: PetOut
    symptoms: str | None
    contact_name: str | None
    contact_phone: str | None
    home_visit_required: bool
    home_visit_address: str | None
    status: AppointmentStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class AppointmentAdminOut(AppointmentOut):
    owner_name: str
    owner_email: EmailStr
    owner_phone: str | None


class AppointmentStatusUpdateRequest(BaseModel):
    status: AppointmentStatus
