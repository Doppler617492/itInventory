"""Audit log model."""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

from api.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    before_json = Column(Text)
    after_json = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
