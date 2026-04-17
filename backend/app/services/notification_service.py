import logging
from datetime import datetime

from app.config import settings

logger = logging.getLogger("aiv.notifications")


class NotificationService:
    """Email notification service.
    Priority: Resend API → SMTP → console logging (dev).
    """

    async def send_request_submitted(self, investor_email: str, request_id: str) -> None:
        await self._send(
            to=investor_email,
            subject="Verification Request Submitted",
            body=f"Your accredited investor verification request ({request_id}) has been submitted and is pending review.",
        )

    async def send_reviewer_assigned(self, investor_email: str, reviewer_name: str) -> None:
        await self._send(
            to=investor_email,
            subject="Reviewer Assigned",
            body=f"A reviewer ({reviewer_name}) has been assigned to your verification request.",
        )

    async def send_info_requested(
        self,
        investor_email: str,
        message: str,
        deadline: datetime | None = None,
    ) -> None:
        deadline_text = ""
        if deadline:
            deadline_text = (
                f"\n\n⚠️  DEADLINE: You must respond by "
                f"{deadline.strftime('%B %d, %Y at %I:%M %p')} UTC.\n"
                f"If you do not upload the required documents within this "
                f"timeframe, your verification request will be automatically DENIED."
            )
        await self._send(
            to=investor_email,
            subject="⚠️ Action Required: Additional Information Requested",
            body=(
                f"The reviewer has requested additional information for your "
                f"accredited investor verification request:\n\n"
                f"{message}"
                f"{deadline_text}\n\n"
                f"Please log in to your account to upload the required documents."
            ),
        )

    async def send_deadline_auto_denied(self, investor_email: str, request_id: str) -> None:
        await self._send(
            to=investor_email,
            subject="Verification Request Denied — Deadline Expired",
            body=(
                f"Your accredited investor verification request ({request_id}) has been "
                f"automatically denied because the required documents were not provided "
                f"within the {settings.INFO_RESPONSE_HOURS}-hour deadline.\n\n"
                f"You may submit a new verification request at any time."
            ),
        )

    async def send_request_approved(self, investor_email: str, letter_number: str) -> None:
        await self._send(
            to=investor_email,
            subject="Verification Approved",
            body=f"Congratulations! Your accredited investor verification has been approved. Letter number: {letter_number}",
        )

    async def send_request_denied(self, investor_email: str, reason: str) -> None:
        await self._send(
            to=investor_email,
            subject="Verification Denied",
            body=f"Your accredited investor verification request has been denied.\n\nReason: {reason}",
        )

    async def _send(self, to: str, subject: str, body: str) -> None:
        # 1. Resend API (preferred for production)
        if settings.RESEND_API_KEY:
            await self._send_resend(to, subject, body)
            return

        # 2. Legacy SMTP
        if settings.SMTP_HOST:
            await self._send_smtp(to, subject, body)
            return

        # 3. Dev console fallback
        logger.info(
            "EMAIL (dev console):\n  To: %s\n  Subject: %s\n  Body: %s\n",
            to,
            subject,
            body,
        )

    async def _send_resend(self, to: str, subject: str, body: str) -> None:
        """Send email via Resend API (https://resend.com)."""
        import httpx

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": settings.RESEND_FROM_EMAIL,
                        "to": [to],
                        "subject": subject,
                        "text": body,
                    },
                    timeout=10.0,
                )
                if response.status_code in (200, 201):
                    logger.info("Resend email sent to %s (subject: %s)", to, subject)
                else:
                    logger.error(
                        "Resend API error %d: %s", response.status_code, response.text
                    )
        except Exception as e:
            logger.error("Failed to send email via Resend: %s", e)

    async def _send_smtp(self, to: str, subject: str, body: str) -> None:
        """Send email via legacy SMTP."""
        import smtplib
        from email.mime.text import MIMEText

        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = to

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info("SMTP email sent to %s (subject: %s)", to, subject)
        except Exception as e:
            logger.error("Failed to send email via SMTP: %s", e)


notification_service = NotificationService()
