from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.auth import LoginRequest, RefreshResponse, RegisterRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()


def _auth_service(db: AsyncSession) -> AuthService:
    return AuthService(db, get_settings())


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    settings = get_settings()
    max_age = settings.refresh_token_expire_days * 86400
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
        max_age=max_age,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    access, refresh, user = await _auth_service(db).register(body)
    _set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=access, user=user)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    access, refresh, user = await _auth_service(db).login(body)
    _set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=access, user=user)


@router.post("/logout")
async def logout(response: Response) -> dict[str, str]:
    settings = get_settings()
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path="/api/v1/auth",
    )
    return {"status": "ok"}


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_session(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RefreshResponse:
    settings = get_settings()
    raw = request.cookies.get(settings.refresh_cookie_name)
    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing refresh cookie")
    access = await _auth_service(db).refresh(raw)
    return RefreshResponse(access_token=access)
