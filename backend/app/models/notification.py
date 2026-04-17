import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NotificationType(str, enum.Enum):
    NEW_MESSAGE = "NEW_MESSAGE"
    REQUEST_APPROVED = "REQUEST_APPROVED"
    REQUEST_DENIED = "REQUEST_DENIED"
    INFO_REQUESTED = "INFO_REQUESTED"
    INFO_PROVIDED = "INFO_PROVIDED"
    REQUEST_SUBMITTED = "REQUEST_SUBMITTED"
    REQUEST_ASSIGNED = "REQUEST_ASSIGNED"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    request_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("verification_requests.id"), nullable=True
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = relationship("User", back_populates="notifications")
