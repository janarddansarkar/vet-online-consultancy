import secrets
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # Default: the project's own Postgres server (data in <project>/db, port 5433), started by the backend,
    # connecting as the current OS user.
    database_url: str = "postgresql+psycopg://localhost:5433/vet_online_consultancy"
    # Where that server keeps its data. Only used when DATABASE_URL points at localhost:5433.
    local_postgres_dir: str = str(PROJECT_DIR / "db")
    # Signs login tokens. Generated and saved to backend/.env on first run if not set.
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    admin_token_expire_minutes: int = 480
    cors_origins: str = "http://localhost:5173"
    google_client_id: str = ""
    # Password for the doctor's admin dashboard. Generated and saved to backend/.env on first run if not set.
    admin_password: str = ""
    app_base_url: str = "http://localhost:5173"
    # Outgoing email (password reset links). Without SMTP_HOST the reset link is only written to the backend log.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    password_reset_expire_minutes: int = 30

    @field_validator("database_url")
    @classmethod
    def _use_psycopg_driver(cls, value: str) -> str:
        """Hosts and docs often give postgres:// or postgresql://; SQLAlchemy needs the psycopg 3 driver prefix."""
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


def _ensure_secret(settings: Settings, field: str, generate) -> bool:
    """Generate a missing secret once and save it to backend/.env so it survives restarts.

    Returns True when a new value was generated.
    """
    if getattr(settings, field):
        return False
    value = generate()
    setattr(settings, field, value)
    existing = ENV_FILE.read_text() if ENV_FILE.exists() else ""
    separator = "" if not existing or existing.endswith("\n") else "\n"
    ENV_FILE.write_text(f"{existing}{separator}{field.upper()}={value}\n")
    return True


settings = Settings()
_ensure_secret(settings, "jwt_secret", lambda: secrets.token_hex(32))
if _ensure_secret(settings, "admin_password", lambda: secrets.token_urlsafe(12)):
    print(f"\nAdmin dashboard password (saved to {ENV_FILE}): {settings.admin_password}\n")
