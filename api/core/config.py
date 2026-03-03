"""Application configuration."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings from environment."""

    # Database (SQLite za lokalni dev; PostgreSQL preporučeno za produkciju)
    DATABASE_URL: str = "sqlite:///./itproc.db"

    # JWT
    JWT_SECRET: str = "change-me-in-production-use-strong-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS (dodaj mrežnu adresu ako pristupaš preko npr. http://192.168.1.190:5173)
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.190:5173"

    # Upload (relativna putanja za lokalni dev)
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: set[str] = {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx",
        ".png", ".jpg", ".jpeg", ".gif"
    }

    # Approval thresholds (EUR)
    THRESHOLD_MANAGER_ONLY: float = 300
    THRESHOLD_FINANCE: float = 2000

    # Email (SMTP) - za notifikacije
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "IT Nabavka <noreply@company.com>"
    # Steps: IT (always) -> MANAGER -> FINANCE (if > 300) -> CEO (if > 2000)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
