from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UserRead


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._users = UserRepository(session)

    async def register(self, body: RegisterRequest) -> tuple[str, str, UserRead]:
        existing = await self._users.get_by_email(body.email)
        if existing:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered")
        user = await self._users.create(
            email=body.email,
            password_hash=hash_password(body.password),
            name=body.name or "",
        )
        await self._session.commit()
        access = create_access_token(self._settings, user.id)
        refresh = create_refresh_token(self._settings, user.id)
        return access, refresh, UserRead.model_validate(user)

    async def login(self, body: LoginRequest) -> tuple[str, str, UserRead]:
        user = await self._users.get_by_email(body.email)
        if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        access = create_access_token(self._settings, user.id)
        refresh = create_refresh_token(self._settings, user.id)
        return access, refresh, UserRead.model_validate(user)

    async def refresh(self, refresh_token: str) -> str:
        from app.core.security import decode_token

        try:
            user_id = decode_token(self._settings, refresh_token, "refresh")
        except ValueError:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from None
        user = await self._users.get_by_id(user_id)
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return create_access_token(self._settings, user.id)
