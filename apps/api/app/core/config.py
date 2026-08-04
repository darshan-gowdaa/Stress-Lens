import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/stresslens"
    # sync URL for celery tasks (psycopg2 driver)
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/stresslens"
    REDIS_URL: str = "redis://localhost:6379/0"
    K_ANONYMITY_THRESHOLD: int = 5
    ANONYMITY_SALT: str = "stresslens_default_salt"
    CLAUDE_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    MLFLOW_TRACKING_URI: str = "sqlite:///mlflow.db"
    APP_ENV: str = "development"

    @property
    def CELERY_BROKER_URL(self) -> str:
        return os.getenv("CELERY_BROKER_URL", self.REDIS_URL)

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return os.getenv("CELERY_RESULT_BACKEND", self.REDIS_URL)


settings = Settings()
