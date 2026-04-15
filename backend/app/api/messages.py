from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.message import Message
from app.models.user import User, UserRole
from app.models.verification_request import VerificationRequest
from app.schemas.message import MessageCreate, MessageListResponse, MessageResponse

router = APIRouter(prefix="/api/messages", tags=["Messages"])


@router.get("/{request_id}", response_model=MessageListResponse)
async def get_messages(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check access
    await _check_access(db, request_id, current_user)

    result = await db.execute(
        select(Message)
        .where(Message.request_id == request_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    items = []
    for msg in messages:
        sender_result = await db.execute(select(User).where(User.id == msg.sender_id))
        sender = sender_result.scalar_one()
        items.append(
            MessageResponse(
                id=msg.id,
                request_id=msg.request_id,
                sender_id=msg.sender_id,
                sender_name=f"{sender.first_name} {sender.last_name}",
                sender_role=sender.role.value,
                content=msg.content,
                is_system_message=msg.is_system_message,
                created_at=msg.created_at,
            )
        )

    return MessageListResponse(items=items)


@router.post("/{request_id}", response_model=MessageResponse, status_code=201)
async def send_message(
    request_id: str,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_access(db, request_id, current_user)

    msg = Message(
        request_id=request_id,
        sender_id=current_user.id,
        content=data.content,
        is_system_message=False,
    )
    db.add(msg)
    await db.flush()

    return MessageResponse(
        id=msg.id,
        request_id=msg.request_id,
        sender_id=msg.sender_id,
        sender_name=f"{current_user.first_name} {current_user.last_name}",
        sender_role=current_user.role.value,
        content=msg.content,
        is_system_message=msg.is_system_message,
        created_at=msg.created_at,
    )


async def _check_access(db: AsyncSession, request_id: str, user: User) -> VerificationRequest:
    result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if user.role == UserRole.INVESTOR and req.investor_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if user.role == UserRole.REVIEWER and req.assigned_reviewer_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return req
