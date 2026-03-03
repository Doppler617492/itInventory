"""Settings API - SMTP config (admin only)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, AppConfig

router = APIRouter()


def _get_config(db: Session, key: str) -> Optional[str]:
    r = db.query(AppConfig).filter(AppConfig.key == key).first()
    return r.value if r else None


def _set_config(db: Session, key: str, value: Optional[str]):
    r = db.query(AppConfig).filter(AppConfig.key == key).first()
    if r:
        r.value = value
    else:
        db.add(AppConfig(key=key, value=value))
    db.flush()


class EmailConfigOut(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_from: str
    # smtp_password se ne šalje na front


class EmailConfigUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None


@router.get("/email", response_model=EmailConfigOut)
def get_email_config(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator")
    return EmailConfigOut(
        smtp_host=_get_config(db, "smtp_host") or "",
        smtp_port=int(_get_config(db, "smtp_port") or "587"),
        smtp_user=_get_config(db, "smtp_user") or "",
        smtp_from=_get_config(db, "smtp_from") or "IT Nabavka <noreply@company.com>",
    )


@router.put("/email")
def update_email_config(
    data: EmailConfigUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator")
    if data.smtp_host is not None:
        _set_config(db, "smtp_host", data.smtp_host)
    if data.smtp_port is not None:
        _set_config(db, "smtp_port", str(data.smtp_port))
    if data.smtp_user is not None:
        _set_config(db, "smtp_user", data.smtp_user)
    if data.smtp_password is not None:
        _set_config(db, "smtp_password", data.smtp_password)
    if data.smtp_from is not None:
        _set_config(db, "smtp_from", data.smtp_from)
    db.commit()
    return {"ok": True}
