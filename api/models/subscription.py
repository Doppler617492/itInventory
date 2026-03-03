"""Subscription model."""
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date
from sqlalchemy.orm import relationship
import enum

from api.core.database import Base


class BillingCycle(str, enum.Enum):
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CANCELED = "CANCELED"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(500), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    plan = Column(String(255))
    seats = Column(Integer)
    billing_cycle = Column(String(20), default=BillingCycle.MONTHLY.value)
    cost = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(3), default="EUR")
    renewal_date = Column(Date)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default=SubscriptionStatus.ACTIVE.value)
    notes = Column(String(1000))

    vendor = relationship("Vendor", back_populates="subscriptions")
    owner = relationship("User", back_populates="subscriptions_owned")
