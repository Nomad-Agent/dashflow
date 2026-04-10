import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task


class TaskRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        r = await self._session.execute(select(Task).where(Task.id == task_id))
        return r.scalar_one_or_none()

    async def list_by_project(self, project_id: uuid.UUID) -> list[Task]:
        r = await self._session.execute(
            select(Task).where(Task.project_id == project_id).order_by(Task.position, Task.created_at)
        )
        return list(r.scalars().all())

    async def create(
        self,
        project_id: uuid.UUID,
        title: str,
        description: str | None,
        status: str,
        priority: str,
        due_date,
        start_date,
        assignee_id: uuid.UUID | None,
        created_by_id: uuid.UUID | None,
        position: int,
    ) -> Task:
        t = Task(
            project_id=project_id,
            title=title,
            description=description,
            status=status,
            priority=priority,
            due_date=due_date,
            start_date=start_date,
            assignee_id=assignee_id,
            created_by_id=created_by_id,
            position=position,
        )
        self._session.add(t)
        await self._session.flush()
        await self._session.refresh(t)
        return t

    async def delete(self, task: Task) -> None:
        await self._session.delete(task)
