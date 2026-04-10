"""Shared pytest fixtures for API integration tests."""

import os
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db.session import get_db
from app.main import app
from app.models import Base  # noqa: F401 - ensure metadata registered

# Ensure local pytest uses dedicated test DB from .env when present.
_settings = get_settings()
if _settings.database_url_test and not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = _settings.database_url_test
get_settings.cache_clear()


@pytest.fixture()
def test_database_url() -> str:
    return get_settings().database_url


@pytest.fixture()
async def db_engine(test_database_url: str) -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(test_database_url, echo=False, pool_pre_ping=True, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest.fixture()
async def session_factory(db_engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture()
async def db_cleanup(session_factory: async_sessionmaker[AsyncSession]) -> AsyncIterator[None]:
    async with session_factory() as session:
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()
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
