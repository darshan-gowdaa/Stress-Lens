from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine, Base, get_db
from app.domains.checkins.router import router as checkins_router
from app.domains.checkins.repository import RawCheckin, Prediction  # noqa: F401 - needed for Base.metadata
from app.domains.dashboard.router import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="StressLens API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(checkins_router, prefix="/checkins", tags=["Checkins"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])


@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}
