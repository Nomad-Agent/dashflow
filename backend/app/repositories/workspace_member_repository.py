import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workspace_member import WorkspaceMember


class WorkspaceMemberRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_membership(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember | None:
        r = await self._session.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        return r.scalar_one_or_none()

    async def add(self, workspace_id: uuid.UUID, user_id: uuid.UUID, role: str) -> WorkspaceMember:
        m = WorkspaceMember(workspace_id=workspace_id, user_id=user_id, role=role)
        self._session.add(m)
        await self._session.flush()
        await self._session.refresh(m)
        return m
