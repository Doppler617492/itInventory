"""Invoice model."""
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from api.core.database import Base


class InvoiceStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    MATCHED = "MATCHED"
    CHECKED = "CHECKED"
    APPROVED_FOR_PAYMENT = "APPROVED_FOR_PAYMENT"
    PAID = "PAID"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    invoice_no = Column(String(100), nullable=False)
    invoice_date = Column(Date, nullable=False)
    amount_net = Column(Numeric(14, 2), nullable=False)
    vat_rate = Column(Numeric(5, 2), default=20)
    amount_gross = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(3), default="EUR")
    status = Column(String(50), default=InvoiceStatus.RECEIVED.value)
    payment_method = Column(String(100))
    paid_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    request = relationship("Request", back_populates="invoices")
    vendor = relationship("Vendor", back_populates="invoices")
    documents = relationship("Document", back_populates="invoice", foreign_keys="Document.invoice_id")
    assets = relationship("Asset", back_populates="invoice")
