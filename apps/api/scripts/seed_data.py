import asyncio
from app.core.database import SessionLocal, engine, Base
from app.domains.dashboard.seeder import populate_rich_records


async def seed():
    """Initializes schema and seeds rich 90-day check-in records."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        res = await populate_rich_records(db)
        print("Done seeding data:", res)


if __name__ == "__main__":
    asyncio.run(seed())
