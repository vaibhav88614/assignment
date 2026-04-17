from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Accredited Investor Verification"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database (SQLite for local dev, PostgreSQL for production)
    DATABASE_URL: str = f"sqlite+aiosqlite:///{Path(__file__).resolve().parent.parent / 'aiv.db'}"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production-use-a-random-64-char-hex"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # File uploads
    UPLOAD_DIR: str = str(Path(__file__).resolve().parent.parent / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_UPLOAD_TYPES: list[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
    ]

    # Cloudinary (set CLOUDINARY_URL to enable cloud storage)
    # Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
    CLOUDINARY_URL: str = "cloudinary://366112623952743:_mmw1SazoIxw6jHN49ePF4-KcWI@decvdppwg"

    # Email via Resend (set RESEND_API_KEY to enable; leave empty for console logging)
    RESEND_API_KEY: str = "re_NmNSg8a6_7pLe4yrVroU4yMNmULiLUyzP"
    RESEND_FROM_EMAIL: str = "AccredVerify <noreply@aiv-verify.com>"

    # Legacy SMTP (fallback if RESEND_API_KEY is empty and SMTP_HOST is set)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@aiv-verify.com"

    # Verification letter
    LETTER_VALIDITY_DAYS: int = 90
    INFO_RESPONSE_HOURS: int = 48
    ISSUER_ORG_NAME: str = "AIV Verification Services"
    ISSUER_ORG_ADDRESS: str = "123 Verification Lane, New York, NY 10001"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def normalize_debug(cls, value: object) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"false", "0", "no", "off", "release", "production", "prod"}:
                return False
        return bool(value)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
