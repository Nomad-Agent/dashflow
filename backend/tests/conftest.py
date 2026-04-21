"""Shared pytest fixtures for API integration tests."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from tests.support import (
    configure_test_database_environment,
    migrate_test_database,
    truncate_all_tables,
)

configure_test_database_environment()

from app.core.config import get_settings  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def test_database_url() -> str:
    return get_settings().database_url


@pytest.fixture(scope="session")
def migrated_test_database(test_database_url: str) -> str:
    migrate_test_database(test_database_url)
    return test_database_url


@pytest.fixture(scope="session")
async def db_engine(migrated_test_database: str) -> AsyncIterator[AsyncEngine]:
    test_database_url = migrated_test_database
    engine = create_async_engine(test_database_url, echo=False, pool_pre_ping=True, poolclass=NullPool)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest.fixture()
async def session_factory(db_engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture()
async def db_cleanup(db_engine: AsyncEngine) -> AsyncIterator[None]:
    await truncate_all_tables(db_engine)
    yield


@pytest.fixture()
async def api_client(
    db_cleanup: None, session_factory: async_sessionmaker[AsyncSession]
) -> AsyncIterator[AsyncClient]:
    _ = db_cleanup

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture()
async def auth_client(api_client: AsyncClient) -> AsyncIterator[AsyncClient]:
    payload = {"email": "owner@example.com", "password": "strongpass123", "name": "Owner"}
    r = await api_client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201
    yield api_client
