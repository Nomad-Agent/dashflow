import pytest
from httpx import AsyncClient

from app.core.config import get_settings


@pytest.mark.asyncio
async def test_register_login_refresh_logout_cycle(api_client: AsyncClient) -> None:
    settings = get_settings()
    register_payload = {
        "email": "alice@example.com",
        "password": "strongpass123",
        "name": "Alice",
    }

    r = await api_client.post("/api/v1/auth/register", json=register_payload)
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "alice@example.com"
    assert r.json()["access_token"]
    assert settings.refresh_cookie_name in api_client.cookies

    dup = await api_client.post("/api/v1/auth/register", json=register_payload)
    assert dup.status_code == 409

    bad_login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "wrong"},
    )
    assert bad_login.status_code == 401

    good_login = await api_client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "strongpass123"},
    )
    assert good_login.status_code == 200
    assert good_login.json()["access_token"]

    refresh = await api_client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 200
    assert refresh.json()["access_token"]

    logout = await api_client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    assert logout.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_refresh_without_cookie_is_unauthorized(api_client: AsyncClient) -> None:
    r = await api_client.post("/api/v1/auth/refresh")
    assert r.status_code == 401
    assert r.json()["detail"] == "Missing refresh cookie"
