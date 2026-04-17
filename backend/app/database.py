from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Render provides DATABASE_URL as postgres:// but SQLAlchemy needs postgresql+asyncpg://
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    import app.models  # noqa: F401 — ensure all models registered
    from sqlalchemy import text

    async with engine.begin() as conn:
        # Create any new tables (e.g. notifications)
        await conn.run_sync(Base.metadata.create_all)

        # Add missing columns on PostgreSQL (ALTER TABLE is not handled by create_all)
        if engine.dialect.name == "postgresql":
            await conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'verification_requests'
                          AND column_name = 'last_message_at'
                    ) THEN
                        ALTER TABLE verification_requests
                        ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE;
                    END IF;
                END $$;
            """))
