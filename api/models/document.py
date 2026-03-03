"""Document model for uploads."""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from api.core.database import Base


class DocType(str, enum.Enum):
    OFFER = "OFFER"
    PROFORMA = "PROFORMA"
    INVOICE = "INVOICE"
    CONTRACT = "CONTRACT"
    OTHER = "OTHER"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    doc_type = Column(String(50), default=DocType.OTHER.value)
    filename = Column(String(255), nullable=False)
    mime = Column(String(100))
    size = Column(BigInteger)
    storage_path = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    request = relationship("Request", back_populates="documents")
    invoice = relationship("Invoice", back_populates="documents")
    uploaded_by_user = relationship("User", back_populates="documents_uploaded")
