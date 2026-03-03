"""Application configuration (SMTP, etc.) - stored in DB, editable by admin."""
from sqlalchemy import Column, Integer, String, Text

from api.core.database import Base


class AppConfig(Base):
    __tablename__ = "app_config"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text)
