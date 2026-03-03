"""User model."""
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from api.core.database import Base


class UserRole(str, enum.Enum):
    APPROVER = "APPROVER"  # Odobravatelj - prima zahtjeve za odobrenje
    MANAGER = "MANAGER"
    FINANCE = "FINANCE"
    CEO = "CEO"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.APPROVER.value)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)  # Obavezno za korisnike prodavnica
    is_active = Column(Boolean, default=True)
    notifications_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    location = relationship("Location", back_populates="users")
    requests_created = relationship("Request", back_populates="requester", foreign_keys="Request.requester_id")
    approvals = relationship("Approval", back_populates="approver")
    documents_uploaded = relationship("Document", back_populates="uploaded_by_user")
    assets_assigned = relationship("Asset", back_populates="assigned_user")
    subscriptions_owned = relationship("Subscription", back_populates="owner")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    approver_locations = relationship("UserLocation", back_populates="user", cascade="all, delete-orphan")
    approver_sectors = relationship("UserSector", back_populates="user", cascade="all, delete-orphan")


