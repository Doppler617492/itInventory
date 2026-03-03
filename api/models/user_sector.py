"""Approver -> Sector assignment (koje sektore odobravatelj pokriva)."""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from api.core.database import Base


class UserSector(Base):
    __tablename__ = "user_sectors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sector_id = Column(Integer, ForeignKey("sectors.id", ondelete="CASCADE"), nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "sector_id", name="uq_user_sector"),)

    user = relationship("User", back_populates="approver_sectors")
    sector = relationship("Sector")
