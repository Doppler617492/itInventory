"""Asset model."""
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date
from sqlalchemy.orm import relationship

from api.core.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    name = Column(String(500), nullable=False)
    serial_no = Column(String(100))
    location = Column(String(255))
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    internal_barcode = Column(String(100))
    purchase_date = Column(Date)
    warranty_until = Column(Date)
    cost_gross = Column(Numeric(14, 2))

    request = relationship("Request", back_populates="assets")
    invoice = relationship("Invoice", back_populates="assets")
    assigned_user = relationship("User", back_populates="assets_assigned")
