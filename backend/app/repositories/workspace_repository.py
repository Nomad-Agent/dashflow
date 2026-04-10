import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember


class WorkspaceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, workspace_id: uuid.UUID) -> Workspace | None:
        r = await self._session.execute(select(Workspace).where(Workspace.id == workspace_id))
        return r.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Workspace | None:
        r = await self._session.execute(select(Workspace).where(Workspace.slug == slug))
        return r.scalar_one_or_none()

    async def slug_exists(self, slug: str) -> bool:
        r = await self._session.execute(select(Workspace.id).where(Workspace.slug == slug).limit(1))
        return r.scalar_one_or_none() is not None

    async def list_for_user(self, user_id: uuid.UUID) -> list[Workspace]:
        q = (
            select(Workspace)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .where(WorkspaceMember.user_id == user_id)
            .order_by(Workspace.name)
        )
        r = await self._session.execute(q)
        return list(r.scalars().unique().all())

    async def create(self, name: str, slug: str) -> Workspace:
        ws = Workspace(name=name, slug=slug)
        self._session.add(ws)
        await self._session.flush()
        await self._session.refresh(ws)
        return ws
