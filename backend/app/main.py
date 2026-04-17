import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, verification, documents, messages, admin
from app.config import settings
from app.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aiv")

_deadline_task: asyncio.Task | None = None


async def _deadline_checker():
    """Background task: periodically check for expired info deadlines and auto-deny."""
    from app.database import async_session
    from app.services.verification_service import check_expired_info_deadlines
    from app.services.notification_service import notification_service
    from app.models.user import User
    from app.models.verification_request import VerificationRequest
    from sqlalchemy import select

    while True:
        try:
            await asyncio.sleep(300)  # check every 5 minutes
            async with async_session() as db:
                denied_ids = await check_expired_info_deadlines(db)
                if denied_ids:
                    logger.info("Auto-denied %d expired info requests: %s", len(denied_ids), denied_ids)
                    # Send notification emails for each denied request
                    for rid in denied_ids:
                        result = await db.execute(
                            select(VerificationRequest).where(VerificationRequest.id == rid)
                        )
                        req = result.scalar_one_or_none()
                        if req:
                            inv_result = await db.execute(select(User).where(User.id == req.investor_id))
                            inv = inv_result.scalar_one_or_none()
                            if inv:
                                await notification_service.send_deadline_auto_denied(inv.email, rid)
                    await db.commit()
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("Deadline checker error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _deadline_task
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    await init_db()
    logger.info("Database initialized")
    _deadline_task = asyncio.create_task(_deadline_checker())
    logger.info("Deadline checker background task started")
    yield
    if _deadline_task:
        _deadline_task.cancel()
    logger.info("Shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(verification.router)
app.include_router(documents.router)
app.include_router(messages.router)
app.include_router(admin.router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
