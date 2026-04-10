import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.comment_repository import CommentRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.task_repository import TaskRepository
from app.schemas.comment import CommentCreate, CommentRead, CommentUpdate
from app.services.workspace_service import WorkspaceService


class CommentService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._comments = CommentRepository(session)
        self._tasks = TaskRepository(session)
        self._projects = ProjectRepository(session)
        self._workspace_service = WorkspaceService(session)

    async def _task_context(self, task_id: uuid.UUID):
        t = await self._tasks.get_by_id(task_id)
        if not t:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
        p = await self._projects.get_by_id(t.project_id)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
        return t, p

    async def list_for_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> list[CommentRead]:
        _, p = await self._task_context(task_id)
        await self._workspace_service._require_member(p.workspace_id, user_id)
        rows = await self._comments.list_by_task(task_id)
        return [CommentRead.model_validate(c) for c in rows]

    async def create(self, task_id: uuid.UUID, user_id: uuid.UUID, body: CommentCreate) -> CommentRead:
        _, p = await self._task_context(task_id)
        await self._workspace_service._require_member(p.workspace_id, user_id)
        c = await self._comments.create(task_id=task_id, user_id=user_id, body=body.body)
        await self._workspace_service.touch_updated(p.workspace_id)
        await self._session.commit()
        await self._session.refresh(c)
        return CommentRead.model_validate(c)

    async def update(
        self, comment_id: uuid.UUID, user_id: uuid.UUID, body: CommentUpdate
    ) -> CommentRead:
        c = await self._comments.get_by_id(comment_id)
        if not c:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Comment not found")
        if c.user_id != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not allowed to edit this comment")
        _, p = await self._task_context(c.task_id)
        await self._workspace_service._require_member(p.workspace_id, user_id)
        c.body = body.body
        c.updated_at = datetime.now(UTC)
        await self._workspace_service.touch_updated(p.workspace_id)
        await self._session.commit()
        await self._session.refresh(c)
        return CommentRead.model_validate(c)

    async def delete(self, comment_id: uuid.UUID, user_id: uuid.UUID) -> None:
        c = await self._comments.get_by_id(comment_id)
        if not c:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Comment not found")
        if c.user_id != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this comment")
        _, p = await self._task_context(c.task_id)
        await self._workspace_service._require_member(p.workspace_id, user_id)
        await self._comments.delete(c)
        await self._workspace_service.touch_updated(p.workspace_id)
        await self._session.commit()
