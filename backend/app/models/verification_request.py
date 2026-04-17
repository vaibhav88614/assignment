import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InvestorType(str, enum.Enum):
    INDIVIDUAL = "INDIVIDUAL"
    ENTITY = "ENTITY"


class VerificationMethod(str, enum.Enum):
    INCOME = "INCOME"
    NET_WORTH = "NET_WORTH"
    PROFESSIONAL_CREDENTIAL = "PROFESSIONAL_CREDENTIAL"
    PROFESSIONAL_ROLE = "PROFESSIONAL_ROLE"
    ENTITY_ASSETS = "ENTITY_ASSETS"
    ENTITY_ALL_OWNERS_ACCREDITED = "ENTITY_ALL_OWNERS_ACCREDITED"
    ENTITY_INSTITUTIONAL = "ENTITY_INSTITUTIONAL"


class RequestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    INFO_REQUESTED = "INFO_REQUESTED"
    ADDITIONAL_INFO_PROVIDED = "ADDITIONAL_INFO_PROVIDED"
    APPROVED = "APPROVED"
    DENIED = "DENIED"
    EXPIRED = "EXPIRED"


# Valid state transitions: {current_status: [allowed_next_statuses]}
VALID_TRANSITIONS: dict[RequestStatus, list[RequestStatus]] = {
    RequestStatus.DRAFT: [RequestStatus.SUBMITTED],
    RequestStatus.SUBMITTED: [RequestStatus.UNDER_REVIEW],
    RequestStatus.UNDER_REVIEW: [
        RequestStatus.APPROVED,
        RequestStatus.DENIED,
        RequestStatus.INFO_REQUESTED,
    ],
    RequestStatus.INFO_REQUESTED: [RequestStatus.ADDITIONAL_INFO_PROVIDED, RequestStatus.UNDER_REVIEW],
    RequestStatus.ADDITIONAL_INFO_PROVIDED: [
        RequestStatus.UNDER_REVIEW,
        RequestStatus.APPROVED,
        RequestStatus.DENIED,
        RequestStatus.INFO_REQUESTED,
    ],
    RequestStatus.APPROVED: [RequestStatus.EXPIRED],
    RequestStatus.DENIED: [],
    RequestStatus.EXPIRED: [],
}


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    investor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    assigned_reviewer_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    investor_type: Mapped[InvestorType] = mapped_column(Enum(InvestorType), nullable=False)
    verification_method: Mapped[VerificationMethod] = mapped_column(
        Enum(VerificationMethod), nullable=False
    )
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus), nullable=False, default=RequestStatus.DRAFT
    )
    self_attestation_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    denial_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    info_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    investor = relationship(
        "User", back_populates="verification_requests", foreign_keys=[investor_id]
    )
    reviewer = relationship(
        "User", back_populates="assigned_reviews", foreign_keys=[assigned_reviewer_id]
    )
    documents = relationship("Document", back_populates="request", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="request", cascade="all, delete-orphan")
    letter = relationship(
        "VerificationLetter", back_populates="request", uselist=False, cascade="all, delete-orphan"
    )
