"""Auth routes: login, refresh, me, preferences."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from api.dependencies import get_current_user
from api.models import User
from api.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, UserMe, UserPreferencesUpdate

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account disabled")
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or disabled")
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.get("/me", response_model=UserMe)
def me(user: User = Depends(get_current_user)):
    return UserMe(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        location_name=user.location.name if user.location else None,
        notifications_enabled=getattr(user, "notifications_enabled", True),
        email_enabled=getattr(user, "email_enabled", True),
    )


@router.patch("/me/preferences", response_model=UserMe)
def update_preferences(
    body: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Ažuriraj postavke notifikacija i email-a (čuvaju se u bazi)."""
    if body.notifications_enabled is not None:
        user.notifications_enabled = body.notifications_enabled
    if body.email_enabled is not None:
        user.email_enabled = body.email_enabled
    db.commit()
    db.refresh(user)
    return UserMe(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        location_name=user.location.name if user.location else None,
        notifications_enabled=user.notifications_enabled,
        email_enabled=user.email_enabled,
    )
