from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_pg_url(v: str) -> str:
    if v.startswith("postgres://"):
        v = "postgresql+asyncpg://" + v.removeprefix("postgres://")
    elif v.startswith("postgresql://") and "+asyncpg" not in v.split("://", 1)[0]:
        v = "postgresql+asyncpg://" + v.removeprefix("postgresql://")
    # asyncpg expects `ssl`, while many managed URLs provide libpq-specific query args.
    parts = urlsplit(v)
    query_items = parse_qsl(parts.query, keep_blank_values=True)
    mapped = []
    for key, value in query_items:
        if key == "sslmode":
            mapped.append(("ssl", "require" if value else "require"))
        elif key in {"channel_binding", "gssencmode", "target_session_attrs"}:
            continue
        else:
            mapped.append((key, value))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(mapped), parts.fragment))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow",
        validation_alias=AliasChoices("DATABASE_URL", "DATABASE_URL_DEV"),
    )
    database_url_test: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL_TEST"),
    )

    @field_validator("database_url", mode="after")
    @classmethod
    def ensure_async_driver(cls, v: str) -> str:
        """Normalize runtime DB URL for async SQLAlchemy/asyncpg."""
        return _normalize_pg_url(v)

    @field_validator("database_url_test", mode="after")
    @classmethod
    def ensure_async_driver_for_test(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return _normalize_pg_url(v)
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
