import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import OperationalError

from app.api.v1 import health as health_module
from app.main import app


@pytest.mark.asyncio
async def test_health() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_ready_returns_ok_with_successful_database_check(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def ok_check(*_args, **_kwargs) -> None:
        return None

    monkeypatch.setattr(health_module, "check_database_readiness", ok_check)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/ready")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "database": "ok"}


@pytest.mark.asyncio
async def test_ready_returns_503_when_database_check_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fail_check(*_args, **_kwargs) -> None:
        raise OperationalError("SELECT 1", {}, Exception("missing table"))

    monkeypatch.setattr(health_module, "check_database_readiness", fail_check)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/ready")
    assert r.status_code == 503
    assert r.json() == {"detail": "Database not ready"}
