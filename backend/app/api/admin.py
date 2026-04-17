from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_role
from app.models.user import User, UserRole
from app.models.verification_letter import VerificationLetter
from app.models.verification_request import RequestStatus, VerificationRequest
from app.schemas.letter import LetterResponse
from app.schemas.user import AdminUserUpdate, UserResponse

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/reviewers")
async def list_reviewers_with_workload(
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """List all reviewers with their active review count for assignment UI."""
    result = await db.execute(
        select(User).where(User.role == UserRole.REVIEWER, User.is_active == True)
        .order_by(User.first_name.asc())
    )
    reviewers = list(result.scalars().all())

    active_statuses = [
        RequestStatus.UNDER_REVIEW,
        RequestStatus.INFO_REQUESTED,
        RequestStatus.ADDITIONAL_INFO_PROVIDED,
    ]

    reviewer_data = []
    for rev in reviewers:
        count_result = await db.execute(
            select(func.count()).where(
                VerificationRequest.assigned_reviewer_id == rev.id,
                VerificationRequest.status.in_(active_statuses),
            )
        )
        active_count = count_result.scalar() or 0
        reviewer_data.append({
            "id": rev.id,
            "first_name": rev.first_name,
            "last_name": rev.last_name,
            "email": rev.email,
            "active_reviews": active_count,
        })

    return reviewer_data


@router.post("/requests/{request_id}/assign")
async def assign_reviewer(
    request_id: str,
    data: dict,
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Admin assigns a reviewer to a request and transitions to UNDER_REVIEW."""
    from fastapi import HTTPException, status

    reviewer_id = data.get("reviewer_id")
    if not reviewer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="reviewer_id is required")

    # Verify reviewer exists and is active
    rev_result = await db.execute(select(User).where(User.id == reviewer_id))
    reviewer = rev_result.scalar_one_or_none()
    if not reviewer or reviewer.role != UserRole.REVIEWER or not reviewer.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reviewer")

    # Get request
    req_result = await db.execute(select(VerificationRequest).where(VerificationRequest.id == request_id))
    req = req_result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if req.status not in (RequestStatus.SUBMITTED, RequestStatus.ADDITIONAL_INFO_PROVIDED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign reviewer when status is {req.status.value}",
        )

    req.assigned_reviewer_id = reviewer_id
    req.status = RequestStatus.UNDER_REVIEW

    from app.models.message import Message
    sys_msg = Message(
        request_id=request_id,
        sender_id=_admin.id,
        content=f"Request assigned to reviewer {reviewer.first_name} {reviewer.last_name} by admin. Status changed to UNDER_REVIEW.",
        is_system_message=True,
    )
    db.add(sys_msg)
    await db.flush()

    return {"detail": "Reviewer assigned", "request_id": request_id, "reviewer_id": reviewer_id}


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    role: UserRole | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: AdminUserUpdate,
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException, status

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.is_active is not None:
        user.is_active = data.is_active
    if data.role is not None:
        user.role = data.role
    await db.flush()
    return user


@router.get("/stats")
async def get_stats(
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    # Count users by role
    user_counts = {}
    for role in UserRole:
        result = await db.execute(select(func.count()).where(User.role == role))
        user_counts[role.value] = result.scalar() or 0

    # Count requests by status
    status_counts = {}
    for st in RequestStatus:
        result = await db.execute(
            select(func.count()).where(VerificationRequest.status == st)
        )
        status_counts[st.value] = result.scalar() or 0

    # Total letters issued
    letter_count_result = await db.execute(select(func.count()).select_from(VerificationLetter))
    letter_count = letter_count_result.scalar() or 0

    return {
        "users_by_role": user_counts,
        "requests_by_status": status_counts,
        "total_letters_issued": letter_count,
    }


@router.get("/letters", response_model=list[LetterResponse])
async def list_letters(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone

    result = await db.execute(
        select(VerificationLetter)
        .order_by(VerificationLetter.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    letters = result.scalars().all()
    now = datetime.now(timezone.utc)

    def _ensure_utc(dt: datetime) -> datetime:
        """Ensure a datetime is timezone-aware (UTC). SQLite strips tzinfo;
        PostgreSQL preserves it. This handles both transparently."""
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    return [
        LetterResponse(
            id=l.id,
            request_id=l.request_id,
            letter_number=l.letter_number,
            investor_name=l.investor_name,
            verification_method=l.verification_method,
            issued_at=l.issued_at,
            expires_at=l.expires_at,
            is_valid=_ensure_utc(l.expires_at) > now,
        )
        for l in letters
    ]


@router.get("/letters/{letter_id}/download")
async def download_letter(
    letter_id: str,
    _user: User = Depends(require_role(UserRole.ADMIN, UserRole.REVIEWER, UserRole.INVESTOR)),
    db: AsyncSession = Depends(get_db),
):
    import os
    from fastapi import HTTPException, status
    from fastapi.responses import Response
    from app.services.storage_service import storage_service

    result = await db.execute(select(VerificationLetter).where(VerificationLetter.id == letter_id))
    letter = result.scalar_one_or_none()
    if not letter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Letter not found")

    # Cloud-stored letters: proxy the download to avoid CORS issues
    cloud_url = storage_service.get_download_url(letter.pdf_path)
    if cloud_url:
        import httpx

        async with httpx.AsyncClient() as http_client:
            cloud_resp = await http_client.get(cloud_url, follow_redirects=True)
        media_type = "application/pdf" if letter.pdf_path.endswith(".pdf") else "text/html"
        filename = f"verification_letter_{letter.letter_number}.pdf"
        return Response(
            content=cloud_resp.content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    if not os.path.isfile(letter.pdf_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Letter file not found")

    media_type = "application/pdf" if letter.pdf_path.endswith(".pdf") else "text/html"
    filename = f"verification_letter_{letter.letter_number}.pdf"
    return FileResponse(path=letter.pdf_path, filename=filename, media_type=media_type)
