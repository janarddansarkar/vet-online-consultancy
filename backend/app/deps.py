import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import AdminCredential, User
from app.security import decode_access_token, is_admin_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if credentials is None:
        raise unauthorized

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise unauthorized

    try:
        user = db.get(User, uuid.UUID(user_id))
    except ValueError:
        raise unauthorized
    if user is None:
        raise unauthorized

    return user


def current_admin_password_material(db: Session) -> str:
    """The stored hash once the password has been changed in the dashboard, else the .env password."""
    credential = db.get(AdminCredential, 1)
    return credential.password_hash if credential else settings.admin_password


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> None:
    if credentials is None or not is_admin_token(credentials.credentials, current_admin_password_material(db)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin login required")

