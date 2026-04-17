from fastapi import APIRouter, Depends
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationMarkRead,
    NotificationResponse,
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notifications = list(result.scalars().all())

    unread_result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
    )
    unread_count = unread_result.scalar() or 0

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in notifications],
        unread_count=unread_count,
    )


@router.post("/read")
async def mark_notifications_read(
    data: NotificationMarkRead,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.notification_ids:
        await db.execute(
            update(Notification)
            .where(
                Notification.user_id == current_user.id,
                Notification.id.in_(data.notification_ids),
            )
            .values(is_read=True)
        )
    else:
        await db.execute(
            update(Notification)
            .where(Notification.user_id == current_user.id)
            .values(is_read=True)
        )
    await db.flush()
    return {"ok": True}
