import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VerificationLetter(Base):
    __tablename__ = "verification_letters"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("verification_requests.id"), nullable=False, unique=True
    )
    letter_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    sequence_num: Mapped[int] = mapped_column(Integer, nullable=False)
    investor_name: Mapped[str] = mapped_column(String(200), nullable=False)
    verification_method: Mapped[str] = mapped_column(String(50), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pdf_path: Mapped[str] = mapped_column(String(500), nullable=False)
    letter_html: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    request = relationship("VerificationRequest", back_populates="letter")
