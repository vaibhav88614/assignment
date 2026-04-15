from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Accredited Investor Verification"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
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

    # SMTP (console in dev)
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

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
