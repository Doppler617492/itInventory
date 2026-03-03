"""Approver -> Location assignment (koje prodavnice odobravatelj pokriva)."""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from api.core.database import Base


class UserLocation(Base):
    __tablename__ = "user_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "location_id", name="uq_user_location"),)

    user = relationship("User", back_populates="approver_locations")
    location = relationship("Location")
