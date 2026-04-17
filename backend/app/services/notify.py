"""Helper to create in-app notifications."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole
from app.models.verification_request import VerificationRequest


async def _get_admins(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
    return list(result.scalars().all())


async def notify_new_message(
    db: AsyncSession,
    request: VerificationRequest,
    sender: User,
) -> None:
    """Notify all participants except the sender about a new message."""
    recipient_ids: set[str] = set()
    recipient_ids.add(request.investor_id)
    if request.assigned_reviewer_id:
        recipient_ids.add(request.assigned_reviewer_id)
    # Admins always get message notifications
    for admin in await _get_admins(db):
        recipient_ids.add(admin.id)
    recipient_ids.discard(sender.id)

    for uid in recipient_ids:
        db.add(Notification(
            user_id=uid,
            type=NotificationType.NEW_MESSAGE,
            title="New Message",
            message=f"New message from {sender.first_name} {sender.last_name} on request",
            request_id=request.id,
        ))


async def notify_status_change(
    db: AsyncSession,
    request: VerificationRequest,
    new_status: str,
    actor: User,
) -> None:
    """Create notifications for status transitions."""

    # Investor always gets notified about their request
    investor_id = request.investor_id
    reviewer_id = request.assigned_reviewer_id
    admin_ids = [a.id for a in await _get_admins(db)]

    if new_status == "APPROVED":
        # Notify investor
        db.add(Notification(
            user_id=investor_id,
            type=NotificationType.REQUEST_APPROVED,
            title="Request Approved",
            message="Your accredited investor verification request has been approved.",
            request_id=request.id,
        ))
        # Notify admins
        for aid in admin_ids:
            if aid != actor.id:
                db.add(Notification(
                    user_id=aid,
                    type=NotificationType.REQUEST_APPROVED,
                    title="Request Approved",
                    message=f"Verification request approved by {actor.first_name} {actor.last_name}",
                    request_id=request.id,
                ))

    elif new_status == "DENIED":
        # Notify investor
        db.add(Notification(
            user_id=investor_id,
            type=NotificationType.REQUEST_DENIED,
            title="Request Denied",
            message=f"Your verification request has been denied. Reason: {request.denial_reason or 'Not specified'}",
            request_id=request.id,
        ))
        # Notify admins
        for aid in admin_ids:
            if aid != actor.id:
                db.add(Notification(
                    user_id=aid,
                    type=NotificationType.REQUEST_DENIED,
                    title="Request Denied",
                    message=f"Verification request denied by {actor.first_name} {actor.last_name}",
                    request_id=request.id,
                ))

    elif new_status == "INFO_REQUESTED":
        # Notify investor
        db.add(Notification(
            user_id=investor_id,
            type=NotificationType.INFO_REQUESTED,
            title="Additional Info Requested",
            message="The reviewer has requested additional information for your verification request.",
            request_id=request.id,
        ))

    elif new_status == "ADDITIONAL_INFO_PROVIDED":
        # Notify reviewer and admins
        if reviewer_id and reviewer_id != actor.id:
            db.add(Notification(
                user_id=reviewer_id,
                type=NotificationType.INFO_PROVIDED,
                title="Additional Info Provided",
                message="The investor has provided additional information.",
                request_id=request.id,
            ))
        for aid in admin_ids:
            if aid != actor.id:
                db.add(Notification(
                    user_id=aid,
                    type=NotificationType.INFO_PROVIDED,
                    title="Additional Info Provided",
                    message=f"Investor provided additional information for request",
                    request_id=request.id,
                ))

    elif new_status == "SUBMITTED":
        # Notify admins and assigned reviewer about new submission
        for aid in admin_ids:
            db.add(Notification(
                user_id=aid,
                type=NotificationType.REQUEST_SUBMITTED,
                title="New Request Submitted",
                message=f"A new verification request has been submitted.",
                request_id=request.id,
            ))

    elif new_status == "UNDER_REVIEW":
        # Notify investor that review has started
        if actor.id != investor_id:
            db.add(Notification(
                user_id=investor_id,
                type=NotificationType.REQUEST_ASSIGNED,
                title="Review Started",
                message=f"Your verification request is now being reviewed by {actor.first_name} {actor.last_name}.",
                request_id=request.id,
            ))
