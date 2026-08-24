from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Sync engine for Celery tasks, seed scripts, and migrations
is_sqlite = "sqlite" in settings.sync_database_url
connect_args = {"check_same_thread": False} if is_sqlite else {}

sync_engine = create_engine(
    settings.sync_database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300 if not is_sqlite else -1,
)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

