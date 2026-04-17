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

    def _aware(dt):
        # SQLite strips tzinfo on read; treat stored timestamps as UTC so we
        # can safely compare against the aware `now`.
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt

    return [
        LetterResponse(
            id=l.id,
            request_id=l.request_id,
            letter_number=l.letter_number,
            investor_name=l.investor_name,
            verification_method=l.verification_method,
            issued_at=l.issued_at,
            expires_at=l.expires_at,
            is_valid=_aware(l.expires_at) > now,
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

    result = await db.execute(select(VerificationLetter).where(VerificationLetter.id == letter_id))
    letter = result.scalar_one_or_none()
    if not letter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Letter not found")

    if not os.path.isfile(letter.pdf_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Letter file not found")

    media_type = "application/pdf" if letter.pdf_path.endswith(".pdf") else "text/html"
    filename = f"verification_letter_{letter.letter_number}.pdf"
    return FileResponse(path=letter.pdf_path, filename=filename, media_type=media_type)
