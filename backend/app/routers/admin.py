import secrets
import time
import uuid
from datetime import date, datetime
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.email import send_email
from app.deps import current_admin_password_material, require_admin
from app.models import AdminCredential, Appointment, AppointmentStatus, PetGender
from app.schemas import (
    AdminChangePasswordRequest,
    AdminLoginRequest,
    AdminResetPasswordRequest,
    AdminTokenResponse,
    AppointmentAdminOut,
    AppointmentOut,
    AppointmentStatusUpdateRequest,
    MessageResponse,
)
from app.security import (
    create_admin_reset_token,
    create_admin_token,
    hash_password,
    is_valid_admin_reset_token,
    verify_password,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])
# Everything except /login needs the doctor's admin token.
protected = APIRouter(dependencies=[Depends(require_admin)])

# Single-doctor practice: one shared admin password (ADMIN_PASSWORD), separate from owner accounts.
MAX_FAILED_LOGINS = 5
LOCKOUT_SECONDS = 600
_failed_logins: dict[str, list[float]] = {}


def _check_admin_password(password: str, request: Request, db: Session) -> str:
    """Verifies the admin password with a per-client lockout; returns the password material tokens are bound to."""
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    recent = [t for t in _failed_logins.get(client, []) if now - t < LOCKOUT_SECONDS]
    if len(recent) >= MAX_FAILED_LOGINS:
        _failed_logins[client] = recent
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Try again later.")

    credential = db.get(AdminCredential, 1)
    if credential is not None:
        valid = verify_password(password, credential.password_hash)
    else:
        valid = secrets.compare_digest(password.encode(), settings.admin_password.encode())
    if not valid:
        _failed_logins[client] = recent + [now]
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    _failed_logins.pop(client, None)
    return current_admin_password_material(db)


@router.post("/login", response_model=AdminTokenResponse)
def admin_login(payload: AdminLoginRequest, request: Request, db: Session = Depends(get_db)) -> AdminTokenResponse:
    return AdminTokenResponse(access_token=create_admin_token(_check_admin_password(payload.password, request, db)))


# The link goes only to ADMIN_EMAIL, so the endpoint takes no input. A global cap keeps it from flooding that inbox.
RESET_LINK_MAX_REQUESTS = 3
RESET_LINK_WINDOW_SECONDS = 900
_reset_link_requests: list[float] = []

RESET_LINK_RESPONSE = MessageResponse(
    message="If an admin email is set up for this site, a reset link has been sent to it."
)


@router.post("/forgot-password", response_model=MessageResponse)
def admin_forgot_password(background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> MessageResponse:
    now = time.monotonic()
    _reset_link_requests[:] = [t for t in _reset_link_requests if now - t < RESET_LINK_WINDOW_SECONDS]
    if len(_reset_link_requests) >= RESET_LINK_MAX_REQUESTS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Try again later.")
    _reset_link_requests.append(now)

    if settings.admin_email:
        token = create_admin_reset_token(current_admin_password_material(db))
        link = f"{settings.app_base_url.rstrip('/')}/admin/reset-password?token={token}"
        body = (
            "We got a request to reset the admin dashboard password. Use this link to choose a new one "
            f"(it expires in {settings.password_reset_expire_minutes} minutes and works once):\n\n{link}\n\n"
            "If you didn't ask for this, you can ignore this email."
        )
        background_tasks.add_task(send_email, settings.admin_email, "Reset the admin password", body)
    return RESET_LINK_RESPONSE


@router.post("/reset-password", response_model=MessageResponse)
def admin_reset_password(payload: AdminResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    """Sets a new admin password from an emailed link. Signs out every admin session."""
    if not is_valid_admin_reset_token(payload.token, current_admin_password_material(db)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has expired.")

    new_hash = hash_password(payload.new_password)
    credential = db.get(AdminCredential, 1)
    if credential is None:
        db.add(AdminCredential(id=1, password_hash=new_hash))
    else:
        credential.password_hash = new_hash
    db.commit()
    _failed_logins.clear()
    return MessageResponse(message="The admin password has been reset. You can log in now.")


@protected.post("/change-password", response_model=AdminTokenResponse)
def change_admin_password(
    payload: AdminChangePasswordRequest, request: Request, db: Session = Depends(get_db)
) -> AdminTokenResponse:
    """Stores the new password as a hash. Every other admin session is signed out; this one gets a fresh token."""
    _check_admin_password(payload.current_password, request, db)
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a password different from the current one")

    new_hash = hash_password(payload.new_password)
    credential = db.get(AdminCredential, 1)
    if credential is None:
        db.add(AdminCredential(id=1, password_hash=new_hash))
    else:
        credential.password_hash = new_hash
    db.commit()
    return AdminTokenResponse(access_token=create_admin_token(new_hash))


ALLOWED_TRANSITIONS: dict[AppointmentStatus, set[AppointmentStatus]] = {
    AppointmentStatus.PENDING: {AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED},
    AppointmentStatus.CONFIRMED: {AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED},
    AppointmentStatus.COMPLETED: set(),
    AppointmentStatus.CANCELLED: set(),
}


def _to_admin_out(appointment: Appointment) -> AppointmentAdminOut:
    return AppointmentAdminOut.model_validate(
        {
            **AppointmentOut.model_validate(appointment).model_dump(),
            "owner_name": appointment.contact_name or appointment.pet.owner.full_name,
            "owner_email": appointment.pet.owner.email,
            "owner_phone": appointment.contact_phone or appointment.pet.owner.phone,
        }
    )


@protected.get("/appointments", response_model=list[AppointmentAdminOut])
def list_admin_appointments(
    status_filter: AppointmentStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[AppointmentAdminOut]:
    query = db.query(Appointment).order_by(Appointment.created_at.desc())
    if status_filter is not None:
        query = query.filter(Appointment.status == status_filter)
    return [_to_admin_out(appointment) for appointment in query.all()]


SEX_LABELS = {PetGender.MALE: "Male", PetGender.FEMALE: "Female", PetGender.UNKNOWN: "Not sure"}


def _age(date_of_birth: date | None) -> str:
    if date_of_birth is None:
        return ""
    today = date.today()
    months = (today.year - date_of_birth.year) * 12 + today.month - date_of_birth.month
    if today.day < date_of_birth.day:
        months -= 1
    years, months = divmod(max(months, 0), 12)
    return f"{years} yrs {months} mo"


def _format_datetime(value: datetime | None) -> str:
    return value.strftime("%Y-%m-%d %H:%M") if value else ""


# (column header, value getter) for the Excel export: one row per request, owner and pet details included.
EXPORT_COLUMNS = [
    ("Submitted", lambda a: _format_datetime(a.created_at)),
    ("Status", lambda a: a.status.value.title()),
    ("Home visit required", lambda a: "Yes" if a.home_visit_required else "No"),
    ("Home visit address", lambda a: a.home_visit_address or ""),
    ("Owner name", lambda a: a.contact_name or a.pet.owner.full_name),
    ("Owner WhatsApp", lambda a: a.contact_phone or a.pet.owner.phone or ""),
    ("Account name", lambda a: a.pet.owner.full_name),
    ("Account email", lambda a: a.pet.owner.email),
    ("Pet name", lambda a: a.pet.name or ""),
    ("Species", lambda a: a.pet.species),
    ("Breed", lambda a: a.pet.breed or ""),
    ("Sex", lambda a: SEX_LABELS[a.pet.gender]),
    ("Age", lambda a: _age(a.pet.date_of_birth)),
    ("Date of birth (approx.)", lambda a: a.pet.date_of_birth.isoformat() if a.pet.date_of_birth else ""),
    ("Weight (kg)", lambda a: float(a.pet.weight_kg) if a.pet.weight_kg is not None else ""),
    ("Main problem", lambda a: a.symptoms or ""),
    ("Medical history", lambda a: a.pet.medical_history or ""),
    ("Current medications", lambda a: a.pet.current_medications or ""),
    ("Allergies", lambda a: a.pet.allergies or ""),
]


@protected.get("/appointments/export")
def export_appointments(db: Session = Depends(get_db)) -> Response:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Consultation requests"
    sheet.append([header for header, _ in EXPORT_COLUMNS])
    for cell in sheet[1]:
        cell.font = Font(bold=True)
    sheet.freeze_panes = "A2"

    for appointment in db.query(Appointment).order_by(Appointment.created_at.desc()).all():
        sheet.append([getter(appointment) for _, getter in EXPORT_COLUMNS])

    for column in sheet.columns:
        longest = max(len(str(cell.value or "")) for cell in column)
        sheet.column_dimensions[column[0].column_letter].width = min(max(longest + 2, 12), 50)

    buffer = BytesIO()
    workbook.save(buffer)
    filename = f"consultation-requests-{date.today().isoformat()}.xlsx"
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@protected.patch("/appointments/{appointment_id}/status", response_model=AppointmentAdminOut)
def update_appointment_status(
    appointment_id: uuid.UUID,
    payload: AppointmentStatusUpdateRequest,
    db: Session = Depends(get_db),
) -> AppointmentAdminOut:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    allowed = ALLOWED_TRANSITIONS.get(appointment.status, set())
    if payload.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot move appointment from {appointment.status.value} to {payload.status.value}",
        )


    appointment.status = payload.status
    db.commit()
    db.refresh(appointment)
    return _to_admin_out(appointment)


router.include_router(protected)
