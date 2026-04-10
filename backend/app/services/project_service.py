import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.project_repository import ProjectRepository
from app.repositories.workspace_member_repository import WorkspaceMemberRepository
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.workspace_service import WorkspaceService


class ProjectService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._projects = ProjectRepository(session)
        self._members = WorkspaceMemberRepository(session)
        self._workspace_service = WorkspaceService(session)

    async def list_for_workspace(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> list[ProjectRead]:
        await self._workspace_service._require_member(workspace_id, user_id)
        rows = await self._projects.list_by_workspace(workspace_id)
        return [ProjectRead.model_validate(p) for p in rows]

    async def create(
        self, workspace_id: uuid.UUID, user_id: uuid.UUID, body: ProjectCreate
    ) -> ProjectRead:
        await self._workspace_service._require_member(workspace_id, user_id)
        p = await self._projects.create(
            workspace_id=workspace_id,
            name=body.name,
            description=body.description,
            color=body.color,
            sort_order=body.sort_order,
        )
        await self._workspace_service.touch_updated(workspace_id)
        await self._session.commit()
        await self._session.refresh(p)
        return ProjectRead.model_validate(p)

    async def get(self, project_id: uuid.UUID, user_id: uuid.UUID) -> ProjectRead:
        p = await self._projects.get_by_id(project_id)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
        await self._workspace_service._require_member(p.workspace_id, user_id)
        return ProjectRead.model_validate(p)

    async def update(
        self, project_id: uuid.UUID, user_id: uuid.UUID, body: ProjectUpdate
    ) -> ProjectRead:
        p = await self._projects.get_by_id(project_id)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
        await self._workspace_service._require_member(p.workspace_id, user_id)
        patch = body.model_dump(exclude_unset=True)
        if "name" in patch:
            p.name = patch["name"]
        if "description" in patch:
            p.description = patch["description"]
        if "color" in patch:
            p.color = patch["color"]
        if "sort_order" in patch:
            p.sort_order = patch["sort_order"]
        p.updated_at = datetime.now(UTC)
        await self._workspace_service.touch_updated(p.workspace_id)
        await self._session.commit()
        await self._session.refresh(p)
        return ProjectRead.model_validate(p)

    async def delete(self, project_id: uuid.UUID, user_id: uuid.UUID) -> None:
        p = await self._projects.get_by_id(project_id)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
        ws_id = p.workspace_id
        await self._workspace_service._require_member(ws_id, user_id)
        await self._projects.delete(p)
        await self._workspace_service.touch_updated(ws_id)
        await self._session.commit()
