import os

import pytest

from tests.support import migrate_test_database, resolve_test_database_url


class StubSettings:
    def __init__(self, database_url: str, database_url_test: str | None) -> None:
        self.database_url = database_url
        self.database_url_test = database_url_test


def test_resolve_test_database_url_prefers_database_url_test_locally() -> None:
    settings = StubSettings(
        database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow",
        database_url_test="postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow_test",
    )

    resolved = resolve_test_database_url(environ={}, settings=settings)

    assert resolved == settings.database_url_test


def test_resolve_test_database_url_rejects_missing_local_test_database() -> None:
    settings = StubSettings(
        database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow",
        database_url_test=None,
    )

    with pytest.raises(RuntimeError, match="DATABASE_URL_TEST"):
        resolve_test_database_url(environ={}, settings=settings)


def test_resolve_test_database_url_rejects_matching_local_database_urls() -> None:
    url = "postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow"
    settings = StubSettings(database_url=url, database_url_test=url)

    with pytest.raises(RuntimeError, match="must not match DATABASE_URL"):
        resolve_test_database_url(environ={}, settings=settings)


def test_resolve_test_database_url_allows_ci_fallback_to_database_url() -> None:
    settings = StubSettings(
        database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow_test",
        database_url_test=None,
    )

    resolved = resolve_test_database_url(environ={"CI": "true"}, settings=settings)

    assert resolved == settings.database_url


def test_migrate_test_database_temporarily_sets_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    def fake_upgrade(config, revision: str) -> None:  # type: ignore[no-untyped-def]
        captured["config_path"] = config.config_file_name
        captured["revision"] = revision
        captured["database_url"] = os.environ["DATABASE_URL"]

    monkeypatch.setattr("tests.support.command.upgrade", fake_upgrade)
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow")

    migrate_test_database("postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow_test")

    assert captured["config_path"].endswith("backend/alembic.ini")
    assert captured["revision"] == "head"
    assert captured["database_url"] == "postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow_test"
    assert os.environ["DATABASE_URL"] == "postgresql+asyncpg://postgres:postgres@localhost:5432/dashflow"
