from datetime import datetime

from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    title: str
    message: str
    request_id: str | None = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int


class NotificationMarkRead(BaseModel):
    notification_ids: list[str] | None = None  # None = mark all read
