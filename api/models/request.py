"""Request and related models."""
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, ForeignKey, DateTime, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from api.core.database import Base


class RequestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ORDERED = "ORDERED"
    DELIVERED = "DELIVERED"
    CLOSED = "CLOSED"


class RequestPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    store = Column(String(255), nullable=False)
    sector = Column(String(255), nullable=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Kome se šalje za odobrenje
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    amount_net = Column(Numeric(14, 2), nullable=False)
    vat_rate = Column(Numeric(5, 2), default=20)
    amount_gross = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(3), default="EUR")
    priority = Column(String(20), default=RequestPriority.MEDIUM.value)
    status = Column(String(50), default=RequestStatus.DRAFT.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    requester = relationship("User", back_populates="requests_created", foreign_keys=[requester_id])
    assigned_approver = relationship("User", foreign_keys=[assigned_approver_id])
    vendor = relationship("Vendor", back_populates="requests")
    items = relationship("RequestItem", back_populates="request", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="request", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="request")
    invoices = relationship("Invoice", back_populates="request")
    assets = relationship("Asset", back_populates="request")


class RequestItem(Base):
    __tablename__ = "request_items"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    name = Column(String(500), nullable=False)
    qty = Column(Integer, default=1)
    unit_price_net = Column(Numeric(14, 2), nullable=False)
    vat_rate = Column(Numeric(5, 2), default=20)
    discount_pct = Column(Numeric(5, 2), default=0, nullable=True)  # Opcioni rabat u %
    total_gross = Column(Numeric(14, 2), nullable=False)

    request = relationship("Request", back_populates="items")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    step = Column(Integer, nullable=False)  # 1=MANAGER, 2=FINANCE, 3=CEO
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    decision = Column(String(20))  # APPROVED, REJECTED
    comment = Column(Text)
    decided_at = Column(DateTime(timezone=True))

    request = relationship("Request", back_populates="approvals")
    approver = relationship("User", back_populates="approvals")
