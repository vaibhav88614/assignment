from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.message import Message
from app.models.user import User, UserRole
from app.models.verification_request import VerificationRequest
from app.schemas.message import MessageCreate, MessageListResponse, MessageResponse
from app.services.notify import notify_new_message

router = APIRouter(prefix="/api/messages", tags=["Messages"])


@router.get("/{request_id}", response_model=MessageListResponse)
async def get_messages(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_access(db, request_id, current_user, write=False)

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
    await _check_access(db, request_id, current_user, write=True)

    msg = Message(
        request_id=request_id,
        sender_id=current_user.id,
        content=data.content,
        is_system_message=False,
    )
    db.add(msg)

    # Update last_message_at on the request
    req_result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.id == request_id)
    )
    req = req_result.scalar_one()
    req.last_message_at = datetime.now(timezone.utc)

    await db.flush()

    # Create notifications for other participants
    await notify_new_message(db, req, current_user)
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


async def _check_access(
    db: AsyncSession,
    request_id: str,
    user: User,
    *,
    write: bool,
) -> VerificationRequest:
    result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if user.role == UserRole.INVESTOR and req.investor_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if user.role == UserRole.REVIEWER:
        if write and req.assigned_reviewer_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if not write and req.assigned_reviewer_id not in (None, user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return req
