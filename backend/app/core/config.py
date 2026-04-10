from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow",
        validation_alias=AliasChoices("DATABASE_URL", "DATABASE_URL_DEV"),
    )

    @field_validator("database_url", mode="after")
    @classmethod
    def ensure_async_driver(cls, v: str) -> str:
        """Neon/Render sometimes provide postgresql:// without +asyncpg; async engine requires it."""
        if v.startswith("postgres://"):
            v = "postgresql+asyncpg://" + v.removeprefix("postgres://")
        elif v.startswith("postgresql://") and "+asyncpg" not in v.split("://", 1)[0]:
            v = "postgresql+asyncpg://" + v.removeprefix("postgresql://")
        return v
    jwt_secret_key: str = "dev-only-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    refresh_cookie_name: str = "dashflow_refresh"
    cors_origins: str = "http://localhost:3000,http://localhost:3002"
    # Cross-site SPA (Vercel → API): SameSite=None; Secure required
    refresh_cookie_secure: bool = False
    refresh_cookie_samesite: str = "lax"


@lru_cache
def get_settings() -> Settings:
    return Settings()
