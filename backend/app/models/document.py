import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DocumentType(str, enum.Enum):
    TAX_RETURN = "TAX_RETURN"
    W2 = "W2"
    BANK_STATEMENT = "BANK_STATEMENT"
    BROKERAGE_STATEMENT = "BROKERAGE_STATEMENT"
    CPA_LETTER = "CPA_LETTER"
    ATTORNEY_LETTER = "ATTORNEY_LETTER"
    RIA_LETTER = "RIA_LETTER"
    LICENSE_PROOF = "LICENSE_PROOF"
    ENTITY_FORMATION_DOC = "ENTITY_FORMATION_DOC"
    FINANCIAL_STATEMENT = "FINANCIAL_STATEMENT"
    OTHER = "OTHER"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("verification_requests.id"), nullable=False, index=True
    )
    uploaded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    request = relationship("VerificationRequest", back_populates="documents")
    uploader = relationship("User")
