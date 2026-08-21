import asyncio
from app.core.database import SessionLocal
from sqlalchemy import text

async def f():
    async with SessionLocal() as db:
        res = await db.execute(text('SELECT COUNT(*) FROM raw_checkins'))
        print("Count:", res.scalar())

asyncio.run(f())
