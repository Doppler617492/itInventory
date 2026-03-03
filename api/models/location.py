"""Location (store) lookup model."""
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from api.core.database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)

    users = relationship("User", back_populates="location")
