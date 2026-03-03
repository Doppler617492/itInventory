"""Auth schemas."""
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserMe(BaseModel):
    id: int
    email: str
    name: str
    role: str
    location_name: str | None = None
    notifications_enabled: bool = True
    email_enabled: bool = True

    class Config:
        from_attributes = True


class UserPreferencesUpdate(BaseModel):
    notifications_enabled: bool | None = None
    email_enabled: bool | None = None
