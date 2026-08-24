from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

is_sqlite = "sqlite" in settings.async_database_url
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_async_engine(
    settings.async_database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300 if not is_sqlite else -1,
)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


async def get_db():
    async with SessionLocal() as session:
        yield session

