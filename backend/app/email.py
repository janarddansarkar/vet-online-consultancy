import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("uvicorn.error")


def send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email over SMTP. With no SMTP_HOST set (local dev), log it instead."""
    if not settings.smtp_host:
        logger.warning("SMTP is not configured; email to %s not sent.\nSubject: %s\n%s", to, subject, body)
        return

    message = EmailMessage()
    message["From"] = settings.smtp_from or settings.smtp_username
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception:
        logger.exception("Could not send email to %s", to)
