from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.verification_request import RequestStatus
from app.schemas.verification import (
    StatusTransition,
    VerificationRequestCreate,
    VerificationRequestDetail,
    VerificationRequestListResponse,
    VerificationRequestResponse,
    VerificationRequestSubmit,
    VerificationRequestUpdate,
)
from app.services.verification_service import (
    check_expired_info_deadlines,
    create_request,
    get_request_detail,
    list_requests_for_investor,
    list_requests_for_review,
    submit_request,
    transition_request,
    update_request,
)
from app.services.notify import notify_status_change

router = APIRouter(prefix="/api/verification", tags=["Verification"])


# --- Investor endpoints ---


@router.post("/requests", response_model=VerificationRequestResponse, status_code=201)
async def create_verification_request(
    data: VerificationRequestCreate,
    current_user: User = Depends(require_role(UserRole.INVESTOR)),
    db: AsyncSession = Depends(get_db),
):
    req = await create_request(db, current_user, data)
    return req


@router.get("/requests", response_model=VerificationRequestListResponse)
async def list_my_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role(UserRole.INVESTOR)),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_requests_for_investor(db, current_user.id, page, page_size)
    return VerificationRequestListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/requests/{request_id}", response_model=VerificationRequestDetail)
async def get_verification_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    detail = await get_request_detail(db, request_id)
    # Investors can only see their own; reviewers/admins can see any
    if current_user.role == UserRole.INVESTOR and detail.investor_id != current_user.id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your request")
    return detail


@router.patch("/requests/{request_id}", response_model=VerificationRequestResponse)
async def update_verification_request(
    request_id: str,
    data: VerificationRequestUpdate,
    current_user: User = Depends(require_role(UserRole.INVESTOR)),
    db: AsyncSession = Depends(get_db),
):
    return await update_request(db, request_id, data)


@router.post("/requests/{request_id}/submit", response_model=VerificationRequestResponse)
async def submit_verification_request(
    request_id: str,
    data: VerificationRequestSubmit,
    current_user: User = Depends(require_role(UserRole.INVESTOR)),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException, status as http_status

    if not data.attestation_confirmed:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="You must confirm the attestation to submit",
        )
    return await submit_request(db, request_id, current_user)


@router.post("/requests/{request_id}/provide-info", response_model=VerificationRequestResponse)
async def provide_additional_info(
    request_id: str,
    current_user: User = Depends(require_role(UserRole.INVESTOR)),
    db: AsyncSession = Depends(get_db),
):
    return await transition_request(
        db,
        request_id,
        RequestStatus.UNDER_REVIEW,
        current_user,
    )


# --- Reviewer endpoints ---


@router.get("/review-queue", response_model=VerificationRequestListResponse)
async def get_review_queue(
    status_filter: RequestStatus | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_completed: bool = Query(False),
    current_user: User = Depends(require_role(UserRole.REVIEWER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_requests_for_review(
        db, current_user, status_filter, page, page_size, include_completed=include_completed
    )
    return VerificationRequestListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/requests/{request_id}/transition", response_model=VerificationRequestResponse)
async def transition_verification_request(
    request_id: str,
    data: StatusTransition,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = await transition_request(
        db,
        request_id,
        data.new_status,
        current_user,
        denial_reason=data.denial_reason,
        message_content=data.message,
        deadline_hours=data.deadline_hours,
    )

    # Send notification emails for key transitions
    if data.new_status == RequestStatus.INFO_REQUESTED:
        from app.services.notification_service import notification_service
        from sqlalchemy import select as sa_select
        from app.models.user import User as UserModel

        investor_result = await db.execute(
            sa_select(UserModel).where(UserModel.id == req.investor_id)
        )
        investor = investor_result.scalar_one()
        await notification_service.send_info_requested(
            investor_email=investor.email,
            message=data.message or "Additional information is required.",
            deadline=req.info_deadline,
        )

    # If approved, generate letter and email the investor
    if data.new_status == RequestStatus.APPROVED:
        from app.models.user import User as UserModel
        from app.services.letter_service import generate_letter
        from app.services.notification_service import notification_service
        from sqlalchemy import select

        investor_result = await db.execute(select(UserModel).where(UserModel.id == req.investor_id))
        investor = investor_result.scalar_one()
        letter = await generate_letter(db, req, investor)
        await notification_service.send_request_approved(
            investor_email=investor.email,
            letter_number=letter.letter_number,
        )

    # If denied, email the investor with the reason
    if data.new_status == RequestStatus.DENIED:
        from app.models.user import User as UserModel
        from app.services.notification_service import notification_service
        from sqlalchemy import select

        investor_result = await db.execute(select(UserModel).where(UserModel.id == req.investor_id))
        investor = investor_result.scalar_one()
        await notification_service.send_request_denied(
            investor_email=investor.email,
            reason=req.denial_reason or "No reason provided.",
        )

    return req


@router.post("/check-deadlines")
async def check_deadlines(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: check for INFO_REQUESTED deadlines that expired and auto-deny them."""
    denied_ids = await check_expired_info_deadlines(db)
    return {"denied_count": len(denied_ids), "denied_request_ids": denied_ids}
