import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.project_repository import ProjectRepository
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.workspace_service import WorkspaceService


class TaskService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._tasks = TaskRepository(session)
        self._projects = ProjectRepository(session)
        self._workspace_service = WorkspaceService(session)

    async def list_for_project(self, project_id: uuid.UUID, user_id: uuid.UUID) -> list[TaskRead]:
        p = await self._projects.get_by_id(project_id)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
        await self._workspace_service._require_member(p.workspace_id, user_id)
        rows = await self._tasks.list_by_project(project_id)
        return [TaskRead.model_validate(t) for t in rows]

    async def create(
        self, project_id: uuid.UUID, user_id: uuid.UUID, body: TaskCreate
    ) -> TaskRead:
        p = await self._projects.get_by_id(project_id)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
        await self._workspace_service._require_member(p.workspace_id, user_id)
        t = await self._tasks.create(
            project_id=project_id,
            title=body.title,
            description=body.description,
            status=body.status.value,
            priority=body.priority.value,
            due_date=body.due_date,
            start_date=body.start_date,
            assignee_id=body.assignee_id,
            created_by_id=user_id,
            position=body.position,
        )
        await self._workspace_service.touch_updated(p.workspace_id)
        await self._session.commit()
        await self._session.refresh(t)
        return TaskRead.model_validate(t)

    async def get(self, task_id: uuid.UUID, user_id: uuid.UUID) -> TaskRead:
        t = await self._tasks.get_by_id(task_id)
        if not t:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
        p = await self._projects.get_by_id(t.project_id)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
        await self._workspace_service._require_member(p.workspace_id, user_id)
        return TaskRead.model_validate(t)

    async def update(self, task_id: uuid.UUID, user_id: uuid.UUID, body: TaskUpdate) -> TaskRead:
        t = await self._tasks.get_by_id(task_id)
        if not t:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
        p = await self._projects.get_by_id(t.project_id)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
        await self._workspace_service._require_member(p.workspace_id, user_id)
        patch = body.model_dump(exclude_unset=True)
        if "title" in patch:
            t.title = patch["title"]
        if "description" in patch:
            t.description = patch["description"]
        if "status" in patch:
            t.status = patch["status"].value
        if "priority" in patch:
            t.priority = patch["priority"].value
        if "due_date" in patch:
            t.due_date = patch["due_date"]
        if "start_date" in patch:
            t.start_date = patch["start_date"]
        if "assignee_id" in patch:
            t.assignee_id = patch["assignee_id"]
        if "position" in patch:
            t.position = patch["position"]
        t.updated_at = datetime.now(UTC)
        await self._workspace_service.touch_updated(p.workspace_id)
        await self._session.commit()
        await self._session.refresh(t)
        return TaskRead.model_validate(t)

    async def delete(self, task_id: uuid.UUID, user_id: uuid.UUID) -> None:
        t = await self._tasks.get_by_id(task_id)
        if not t:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
        p = await self._projects.get_by_id(t.project_id)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
        ws_id = p.workspace_id
        await self._workspace_service._require_member(ws_id, user_id)
        await self._tasks.delete(t)
        await self._workspace_service.touch_updated(ws_id)
        await self._session.commit()
