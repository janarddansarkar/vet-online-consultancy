import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ENUM as PgEnum, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def gen_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class PetGender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    UNKNOWN = "UNKNOWN"


class AppointmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


def pg_enum(python_enum: type[enum.Enum], name: str) -> PgEnum:
    return PgEnum(python_enum, name=name, values_callable=lambda e: [item.value for item in e])


# ---------------------------------------------------------------------------
# User (pet owners)
# ---------------------------------------------------------------------------


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    google_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)

    pets: Mapped[list["Pet"]] = relationship(back_populates="owner", foreign_keys="Pet.owner_id")


# ---------------------------------------------------------------------------
# Pet
# ---------------------------------------------------------------------------


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=gen_uuid)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    species: Mapped[str] = mapped_column(String, index=True, nullable=False)
    breed: Mapped[str | None] = mapped_column(String, nullable=True)
    gender: Mapped[PetGender] = mapped_column(pg_enum(PetGender, "pet_gender"), default=PetGender.UNKNOWN, nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_medications: Mapped[str | None] = mapped_column(Text, nullable=True)
    medical_history: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner: Mapped["User"] = relationship(back_populates="pets", foreign_keys=[owner_id])
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="pet", foreign_keys="Appointment.pet_id")


# ---------------------------------------------------------------------------
# Appointment — consultation request linking pet + owner
# ---------------------------------------------------------------------------


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=gen_uuid)
    pet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pets.id", ondelete="RESTRICT"), nullable=False)

    # Contact details given on the booking form; may differ from the account's name/phone.
    contact_name: Mapped[str | None] = mapped_column(String, nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    symptoms: Mapped[str | None] = mapped_column(Text, nullable=True)
    home_visit_required: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)
    home_visit_address: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[AppointmentStatus] = mapped_column(
        pg_enum(AppointmentStatus, "appointment_status"), default=AppointmentStatus.PENDING, index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    pet: Mapped["Pet"] = relationship(back_populates="appointments", foreign_keys=[pet_id])


# ---------------------------------------------------------------------------
# Admin credential (single row: the doctor's dashboard password, once changed from the .env default)
# ---------------------------------------------------------------------------


class AdminCredential(Base):
    __tablename__ = "admin_credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
