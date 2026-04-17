"""Lightweight schema migration for production PostgreSQL.

Runs ALTER TABLE / CREATE TABLE statements idempotently so that
new columns and tables are added without dropping existing data.
Safe to run on every deploy.
"""

import asyncio

from app.database import engine, Base

# Ensure all models are imported so metadata is complete
import app.models  # noqa: F401


async def migrate():
    """Apply incremental schema changes."""
    async with engine.begin() as conn:
        # 1. Create any entirely new tables (e.g. notifications)
        await conn.run_sync(Base.metadata.create_all)

        # 2. Add missing columns to existing tables (PostgreSQL only)
        dialect = engine.dialect.name
        if dialect == "postgresql":
            from sqlalchemy import text
            alter_statements = [
                # Phase 1: last_message_at on verification_requests
                """
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
                """,
            ]
            for stmt in alter_statements:
                await conn.execute(text(stmt))
            print("Migration complete (PostgreSQL — applied ALTER statements).")
        else:
            # SQLite: create_all already handles new tables; columns added
            # via model are already present if DB was freshly created.
            print(f"Migration complete ({dialect} — create_all only).")


if __name__ == "__main__":
    asyncio.run(migrate())
