from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.message import Message
from app.models.user import User, UserRole
from app.models.verification_request import (
    RequestStatus,
    VerificationRequest,
    VALID_TRANSITIONS,
)
from app.schemas.verification import (
    VerificationRequestCreate,
    VerificationRequestDetail,
    VerificationRequestUpdate,
)


async def create_request(
    db: AsyncSession, user: User, data: VerificationRequestCreate
) -> VerificationRequest:
    req = VerificationRequest(
        investor_id=user.id,
        investor_type=data.investor_type,
        verification_method=data.verification_method,
        self_attestation_data=data.self_attestation_data,
        status=RequestStatus.DRAFT,
    )
    db.add(req)
    await db.flush()
    return req


async def get_request(db: AsyncSession, request_id: str) -> VerificationRequest:
    result = await db.execute(
        select(VerificationRequest)
        .options(selectinload(VerificationRequest.documents))
        .options(selectinload(VerificationRequest.letter))
        .where(VerificationRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return req


async def get_request_detail(db: AsyncSession, request_id: str) -> VerificationRequestDetail:
    req = await get_request(db, request_id)

    # Load investor info
    investor_result = await db.execute(select(User).where(User.id == req.investor_id))
    investor = investor_result.scalar_one()

    reviewer_name = None
    if req.assigned_reviewer_id:
        rev_result = await db.execute(select(User).where(User.id == req.assigned_reviewer_id))
        rev = rev_result.scalar_one_or_none()
        if rev:
            reviewer_name = f"{rev.first_name} {rev.last_name}"

    msg_count_result = await db.execute(
        select(func.count()).where(Message.request_id == request_id)
    )
    msg_count = msg_count_result.scalar() or 0

    return VerificationRequestDetail(
        id=req.id,
        investor_id=req.investor_id,
        assigned_reviewer_id=req.assigned_reviewer_id,
        investor_type=req.investor_type,
        verification_method=req.verification_method,
        status=req.status,
        self_attestation_data=req.self_attestation_data,
        denial_reason=req.denial_reason,
        info_deadline=req.info_deadline,
        submitted_at=req.submitted_at,
        reviewed_at=req.reviewed_at,
        expires_at=req.expires_at,
        created_at=req.created_at,
        updated_at=req.updated_at,
        investor_name=f"{investor.first_name} {investor.last_name}",
        investor_email=investor.email,
        reviewer_name=reviewer_name,
        document_count=len(req.documents) if req.documents else 0,
        message_count=msg_count,
        has_letter=req.letter is not None,
        letter_id=req.letter.id if req.letter else None,
    )


async def update_request(
    db: AsyncSession, request_id: str, data: VerificationRequestUpdate
) -> VerificationRequest:
    req = await get_request(db, request_id)
    if req.status != RequestStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update requests in DRAFT status",
        )
    if data.self_attestation_data is not None:
        req.self_attestation_data = data.self_attestation_data
    await db.flush()
    return req


async def submit_request(db: AsyncSession, request_id: str) -> VerificationRequest:
    req = await get_request(db, request_id)
    _validate_transition(req.status, RequestStatus.SUBMITTED)

    if not req.self_attestation_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attestation data is required before submitting",
        )
    if not req.documents or len(req.documents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one supporting document is required",
        )

    req.status = RequestStatus.SUBMITTED
    req.submitted_at = datetime.now(timezone.utc)
    await db.flush()
    return req


async def transition_request(
    db: AsyncSession,
    request_id: str,
    new_status: RequestStatus,
    user: User,
    denial_reason: str | None = None,
    message_content: str | None = None,
    deadline_hours: int | None = None,
) -> VerificationRequest:
    req = await get_request(db, request_id)
    _validate_transition(req.status, new_status)

    # Role-based guards
    if new_status == RequestStatus.UNDER_REVIEW:
        if user.role not in (UserRole.REVIEWER, UserRole.ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only reviewers can claim requests")
        if req.assigned_reviewer_id is None:
            req.assigned_reviewer_id = user.id
    elif new_status in (RequestStatus.APPROVED, RequestStatus.DENIED, RequestStatus.INFO_REQUESTED):
        if user.role not in (UserRole.REVIEWER, UserRole.ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only reviewers can change this status")
        if req.assigned_reviewer_id and req.assigned_reviewer_id != user.id and user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only assigned reviewer or admin can act")
    elif new_status == RequestStatus.ADDITIONAL_INFO_PROVIDED:
        if user.role != UserRole.INVESTOR or req.investor_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the requesting investor can provide info")
        # Enforce info deadline — if expired, reject
        if req.info_deadline and datetime.now(timezone.utc) > req.info_deadline:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The deadline to provide additional information has passed. This request will be denied.",
            )

    req.status = new_status

    if new_status == RequestStatus.DENIED:
        if not denial_reason:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Denial reason is required")
        req.denial_reason = denial_reason
        req.reviewed_at = datetime.now(timezone.utc)

    if new_status == RequestStatus.APPROVED:
        req.reviewed_at = datetime.now(timezone.utc)
        req.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.LETTER_VALIDITY_DAYS)

    if new_status == RequestStatus.INFO_REQUESTED:
        hours = deadline_hours or settings.INFO_RESPONSE_HOURS
        req.info_deadline = datetime.now(timezone.utc) + timedelta(hours=hours)

    if new_status == RequestStatus.ADDITIONAL_INFO_PROVIDED:
        req.info_deadline = None  # Clear deadline once info is provided

    # Auto-create system message for state transitions
    deadline_note = ""
    if new_status == RequestStatus.INFO_REQUESTED and req.info_deadline:
        deadline_note = f" — Respond by {req.info_deadline.strftime('%b %d, %Y %I:%M %p')} UTC or this request will be denied."
    sys_msg = Message(
        request_id=request_id,
        sender_id=user.id,
        content=f"Status changed to {new_status.value}" + deadline_note,
        is_system_message=True,
    )
    db.add(sys_msg)

    # Add reviewer message as a separate non-system message (not duplicated in sys_msg)
    if message_content:
        user_msg = Message(
            request_id=request_id,
            sender_id=user.id,
            content=message_content,
            is_system_message=False,
        )
        db.add(user_msg)

    await db.flush()
    return req


async def check_expired_info_deadlines(db: AsyncSession) -> list[str]:
    """Find requests past their info_deadline and auto-deny them."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(VerificationRequest).where(
            VerificationRequest.status == RequestStatus.INFO_REQUESTED,
            VerificationRequest.info_deadline.isnot(None),
            VerificationRequest.info_deadline < now,
        )
    )
    expired = list(result.scalars().all())
    denied_ids = []
    for req in expired:
        req.status = RequestStatus.DENIED
        req.denial_reason = (
            f"Automatically denied: investor did not respond to information request "
            f"within the {settings.INFO_RESPONSE_HOURS}-hour deadline."
        )
        req.reviewed_at = now
        req.info_deadline = None
        sys_msg = Message(
            request_id=req.id,
            sender_id=req.assigned_reviewer_id or req.investor_id,
            content=(
                f"Request automatically DENIED — the {settings.INFO_RESPONSE_HOURS}-hour deadline "
                "to provide additional information has expired."
            ),
            is_system_message=True,
        )
        db.add(sys_msg)
        denied_ids.append(req.id)
    await db.flush()
    return denied_ids


async def list_requests_for_investor(
    db: AsyncSession, user_id: str, page: int = 1, page_size: int = 20
) -> tuple[list[VerificationRequest], int]:
    count_result = await db.execute(
        select(func.count()).where(VerificationRequest.investor_id == user_id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(VerificationRequest)
        .where(VerificationRequest.investor_id == user_id)
        .order_by(VerificationRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), total


async def list_requests_for_review(
    db: AsyncSession,
    user: User,
    status_filter: RequestStatus | None = None,
    page: int = 1,
    page_size: int = 20,
    include_completed: bool = False,
) -> tuple[list[VerificationRequest], int]:
    active_statuses = [
        RequestStatus.SUBMITTED,
        RequestStatus.UNDER_REVIEW,
        RequestStatus.ADDITIONAL_INFO_PROVIDED,
        RequestStatus.INFO_REQUESTED,
    ]
    if include_completed:
        active_statuses += [RequestStatus.APPROVED, RequestStatus.DENIED, RequestStatus.EXPIRED]
    query = select(VerificationRequest).where(
        VerificationRequest.status.in_(active_statuses)
    )
    if status_filter:
        query = query.where(VerificationRequest.status == status_filter)

    count_q = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_q)
    total = count_result.scalar() or 0

    result = await db.execute(
        query.order_by(VerificationRequest.submitted_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), total


def _validate_transition(current: RequestStatus, target: RequestStatus) -> None:
    allowed = VALID_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {current.value} to {target.value}",
        )
