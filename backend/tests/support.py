"""Helpers for backend integration test database bootstrapping."""

from __future__ import annotations

import os
from collections.abc import Mapping
from pathlib import Path
from typing import Protocol

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings
from app.models import Base


class DatabaseSettings(Protocol):
    database_url: str
    database_url_test: str | None


def _is_ci_environment(environ: Mapping[str, str]) -> bool:
    return environ.get("CI", "").lower() == "true" or environ.get("GITHUB_ACTIONS", "").lower() == "true"


def resolve_test_database_url(
    *,
    environ: Mapping[str, str] | None = None,
    settings: DatabaseSettings | None = None,
) -> str:
    active_environ = os.environ if environ is None else environ
    active_settings = settings or get_settings()
    database_url = active_environ.get("DATABASE_URL") or active_settings.database_url
    database_url_test = active_environ.get("DATABASE_URL_TEST") or active_settings.database_url_test

    if not database_url_test:
        if _is_ci_environment(active_environ) and database_url:
            return database_url
        raise RuntimeError("DATABASE_URL_TEST must be set for local integration tests.")

    if not _is_ci_environment(active_environ) and database_url_test == database_url:
        raise RuntimeError("DATABASE_URL_TEST must not match DATABASE_URL for local integration tests.")

    return database_url_test


def configure_test_database_environment() -> str:
    test_database_url = resolve_test_database_url()
    os.environ["DATABASE_URL"] = test_database_url
    os.environ.setdefault("DATABASE_URL_TEST", test_database_url)
    get_settings.cache_clear()
    return test_database_url


def migrate_test_database(test_database_url: str) -> None:
    previous_database_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = test_database_url
    get_settings.cache_clear()
    alembic_config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    try:
        command.upgrade(alembic_config, "head")
    finally:
        if previous_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous_database_url
        get_settings.cache_clear()


async def truncate_all_tables(engine: AsyncEngine) -> None:
    table_names = [f'"{table.name}"' for table in Base.metadata.sorted_tables]
    if not table_names:
        return

    statement = "TRUNCATE TABLE " + ", ".join(table_names) + " CASCADE"
    async with engine.begin() as connection:
        await connection.execute(text(statement))
