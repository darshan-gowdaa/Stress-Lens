import os
import re
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite+aiosqlite:///./stresslens.db"
    # sync URL for celery tasks and alembic
    SYNC_DATABASE_URL: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"
    PORT: int = 8000
    K_ANONYMITY_THRESHOLD: int = 5
    ANONYMITY_SALT: str = "stresslens_default_salt"
    CLAUDE_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    MLFLOW_TRACKING_URI: str = "sqlite:///mlflow.db"
    APP_ENV: str = "development"

    @property
    def async_database_url(self) -> str:
        # Convert Render or standard postgres URLs to asyncpg
        url = self.DATABASE_URL.strip() if self.DATABASE_URL else "sqlite+aiosqlite:///./stresslens.db"
        if url.startswith("postgres://"):
            url = "postgresql+asyncpg://" + url[len("postgres://"):]
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]
        elif url.startswith("sqlite://") and not url.startswith("sqlite+"):
            url = "sqlite+aiosqlite://" + url[len("sqlite://"):]
        
        # asyncpg does not support sslmode parameter, remove it
        if "+asyncpg" in url and "sslmode=" in url:
            url = re.sub(r"([?&])sslmode=[^&]+(&?)", r"\1\2", url).rstrip("?&")
        return url

    @property
    def sync_database_url(self) -> str:
        # Fall back to DATABASE_URL if SYNC_DATABASE_URL is not set or defaulted to sqlite while db is postgres
        raw = self.SYNC_DATABASE_URL.strip() if self.SYNC_DATABASE_URL else ""
        if not raw or (raw.startswith("sqlite") and "postgres" in self.DATABASE_URL):
            raw = self.DATABASE_URL

        if raw.startswith("postgres://"):
            return "postgresql+psycopg2://" + raw[len("postgres://"):]
        elif raw.startswith("postgresql+asyncpg://"):
            return "postgresql+psycopg2://" + raw[len("postgresql+asyncpg://"):]
        elif raw.startswith("postgresql://") and not raw.startswith("postgresql+"):
            return "postgresql+psycopg2://" + raw[len("postgresql://"):]
        elif raw.startswith("sqlite+aiosqlite://"):
            return "sqlite://" + raw[len("sqlite+aiosqlite://"):]
        return raw

    @property
    def CELERY_BROKER_URL(self) -> str:
        return os.getenv("CELERY_BROKER_URL", self.REDIS_URL)

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return os.getenv("CELERY_RESULT_BACKEND", self.REDIS_URL)


settings = Settings()

