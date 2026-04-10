import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        r = await self._session.execute(select(User).where(User.id == user_id))
        return r.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        r = await self._session.execute(select(User).where(User.email == email.lower()))
        return r.scalar_one_or_none()

    async def create(self, email: str, password_hash: str, name: str) -> User:
        user = User(email=str(email).lower(), password_hash=password_hash, name=name)
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user
