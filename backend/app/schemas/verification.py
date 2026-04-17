from datetime import datetime

from pydantic import BaseModel, Field

from app.models.verification_request import (
    InvestorType,
    RequestStatus,
    VerificationMethod,
)


class VerificationRequestCreate(BaseModel):
    investor_type: InvestorType
    verification_method: VerificationMethod
    self_attestation_data: dict | None = None


class VerificationRequestUpdate(BaseModel):
    self_attestation_data: dict | None = None


class VerificationRequestSubmit(BaseModel):
    """Investor submits a DRAFT request — attestation checkbox required."""
    attestation_confirmed: bool = Field(
        ...,
        description="Investor confirms the information is true and accurate.",
    )


class StatusTransition(BaseModel):
    new_status: RequestStatus
    denial_reason: str | None = None
    message: str | None = None
    deadline_hours: int | None = Field(
        None,
        description="Hours until deadline for INFO_REQUESTED (defaults to server config INFO_RESPONSE_HOURS)",
    )


class VerificationRequestResponse(BaseModel):
    id: str
    investor_id: str
    assigned_reviewer_id: str | None
    investor_type: InvestorType
    verification_method: VerificationMethod
    status: RequestStatus
    self_attestation_data: dict | None
    denial_reason: str | None
    info_deadline: datetime | None
    submitted_at: datetime | None
    reviewed_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VerificationRequestDetail(VerificationRequestResponse):
    investor_name: str = ""
    investor_email: str = ""
    reviewer_name: str | None = None
    document_count: int = 0
    message_count: int = 0
    has_letter: bool = False
    letter_id: str | None = None


class VerificationRequestListResponse(BaseModel):
    items: list[VerificationRequestResponse]
    total: int
    page: int
    page_size: int
