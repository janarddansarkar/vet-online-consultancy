import time
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.email import send_email
from app.schemas import (
    AuthResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    UserOut,
)
from app.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
    password_matches_fingerprint,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing = db.query(User).filter(or_(User.email == payload.email, User.phone == payload.phone)).first()
    if existing is not None:
        detail = "Email already registered" if existing.email == payload.email else "Phone already registered"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or user.password_hash is None or not verify_password(payload.password, user.password_hash):
        raise unauthorized

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


# Light in-memory limit so the endpoint can't be used to flood someone's inbox.
FORGOT_PASSWORD_MAX_REQUESTS = 5
FORGOT_PASSWORD_WINDOW_SECONDS = 900
_forgot_password_requests: dict[str, list[float]] = {}

FORGOT_PASSWORD_RESPONSE = MessageResponse(
    message="If an account exists for that email, we've sent a link to reset the password."
)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MessageResponse:
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    recent = [t for t in _forgot_password_requests.get(client, []) if now - t < FORGOT_PASSWORD_WINDOW_SECONDS]
    if len(recent) >= FORGOT_PASSWORD_MAX_REQUESTS:
        _forgot_password_requests[client] = recent
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Try again later.")
    _forgot_password_requests[client] = recent + [now]

    # Same response whether or not the email is registered, so this can't be used to find out who has an account.
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None:
        token = create_password_reset_token(str(user.id), user.password_hash)
        link = f"{settings.app_base_url.rstrip('/')}/reset-password?token={token}"
        body = (
            f"Hi {user.full_name},\n\n"
            "We got a request to reset your password. Use this link to choose a new one "
            f"(it expires in {settings.password_reset_expire_minutes} minutes):\n\n{link}\n\n"
            "If you didn't ask for this, you can ignore this email."
        )
        background_tasks.add_task(send_email, user.email, "Reset your password", body)
    return FORGOT_PASSWORD_RESPONSE


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has expired."
    )
    decoded = decode_password_reset_token(payload.token)
    if decoded is None:
        raise invalid
    user_id, fingerprint = decoded
    try:
        user = db.get(User, uuid.UUID(user_id))
    except (ValueError, TypeError):
        raise invalid
    if user is None or not password_matches_fingerprint(user.password_hash, fingerprint):
        raise invalid

    user.password_hash = hash_password(payload.password)
    db.commit()
    return MessageResponse(message="Your password has been reset. You can log in now.")


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google sign-in is not configured")

    try:
        claims = google_id_token.verify_oauth2_token(
            payload.credential, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google credential")

    if not claims.get("email_verified", False):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")

    google_id = claims["sub"]
    email = claims["email"]

    user = db.query(User).filter(User.google_id == google_id).first()
    if user is None:
        user = db.query(User).filter(User.email == email).first()
        if user is not None:
            user.google_id = google_id
        else:
            user = User(
                full_name=claims.get("name") or email.split("@")[0],
                email=email,
                google_id=google_id,
            )
            db.add(user)

    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
