"""Sector lookup model."""
from sqlalchemy import Column, Integer, String

from api.core.database import Base


class Sector(Base):
    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
