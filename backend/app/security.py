import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def admin_password_version(password_material: str) -> str:
    """Keyed fingerprint of the current admin password (its stored hash, or the .env password before the first
    change). Admin tokens embed it, so changing the password signs out every other session. Keyed so the token
    can't be used to guess a weak password offline."""
    return hmac.new(settings.jwt_secret.encode(), password_material.encode(), hashlib.sha256).hexdigest()[:16]


def create_admin_token(password_material: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.admin_token_expire_minutes)
    payload = {"sub": "admin", "role": "admin", "pwv": admin_password_version(password_material), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def decode_access_token(token: str) -> str | None:
    """Subject of an owner's token. Admin tokens are not valid here."""
    payload = _decode(token)
    if payload is None or "role" in payload or "purpose" in payload:
        return None
    return payload.get("sub")


def _password_fingerprint(password_hash: str | None) -> str:
    return hashlib.sha256((password_hash or "").encode()).hexdigest()[:16]


def create_password_reset_token(user_id: str, password_hash: str | None) -> str:
    """Single-use in effect: it embeds a fingerprint of the current password, so it stops working once the
    password changes."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_expire_minutes)
    payload = {
        "sub": user_id,
        "purpose": "password_reset",
        "pwd": _password_fingerprint(password_hash),
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_password_reset_token(token: str) -> tuple[str, str] | None:
    """Returns (user id, password fingerprint) for a valid reset token."""
    payload = _decode(token)
    if payload is None or payload.get("purpose") != "password_reset":
        return None
    return payload.get("sub"), payload.get("pwd", "")


def password_matches_fingerprint(password_hash: str | None, fingerprint: str) -> bool:
    return secrets.compare_digest(_password_fingerprint(password_hash), fingerprint)


def create_admin_reset_token(password_material: str) -> str:
    """Single-use in effect: bound to the current admin password, so it dies once the password changes."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_expire_minutes)
    payload = {
        "purpose": "admin_password_reset",
        "pwv": admin_password_version(password_material),
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def is_valid_admin_reset_token(token: str, password_material: str) -> bool:
    payload = _decode(token)
    if payload is None or payload.get("purpose") != "admin_password_reset":
        return False
    return secrets.compare_digest(str(payload.get("pwv", "")), admin_password_version(password_material))


def is_admin_token(token: str, password_material: str) -> bool:
    payload = _decode(token)
    if payload is None or payload.get("role") != "admin":
        return False
    return secrets.compare_digest(str(payload.get("pwv", "")), admin_password_version(password_material))
