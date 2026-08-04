from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Sync engine for Celery tasks (can't use asyncpg in sync context)
sync_engine = create_engine(settings.SYNC_DATABASE_URL)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()
