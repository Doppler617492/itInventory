"""Notifications router."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Notification

router = APIRouter()


class NotificationOut(BaseModel):
    id: int
    title: str
    message: Optional[str]
    type: str
    link: Optional[str]
    read: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.read == False)
    return q.order_by(Notification.created_at.desc()).limit(limit).all()


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"count": db.query(Notification).filter(Notification.user_id == user.id, Notification.read == False).count()}


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if n:
        n.read = True
        db.commit()
    return {"ok": True}


@router.post("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.query(Notification).filter(Notification.user_id == user.id).update({Notification.read: True})
    db.commit()
    return {"ok": True}
