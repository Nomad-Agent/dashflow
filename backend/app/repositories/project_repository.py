import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project


class ProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, project_id: uuid.UUID) -> Project | None:
        r = await self._session.execute(select(Project).where(Project.id == project_id))
        return r.scalar_one_or_none()

    async def list_by_workspace(self, workspace_id: uuid.UUID) -> list[Project]:
        r = await self._session.execute(
            select(Project)
            .where(Project.workspace_id == workspace_id)
            .order_by(Project.sort_order, Project.name)
        )
        return list(r.scalars().all())

    async def create(
        self,
        workspace_id: uuid.UUID,
        name: str,
        description: str | None,
        color: str | None,
        sort_order: int,
    ) -> Project:
        p = Project(
            workspace_id=workspace_id,
            name=name,
            description=description,
            color=color,
            sort_order=sort_order,
        )
        self._session.add(p)
        await self._session.flush()
        await self._session.refresh(p)
        return p

    async def delete(self, project: Project) -> None:
        await self._session.delete(project)
