"""Vendor model."""
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from api.core.database import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    pib = Column(String(50))
    address = Column(String(500))
    contact = Column(String(255))

    # Relationships
    requests = relationship("Request", back_populates="vendor")
    invoices = relationship("Invoice", back_populates="vendor")
    subscriptions = relationship("Subscription", back_populates="vendor")
