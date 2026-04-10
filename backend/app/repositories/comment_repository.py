import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment


class CommentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, comment_id: uuid.UUID) -> Comment | None:
        r = await self._session.execute(select(Comment).where(Comment.id == comment_id))
        return r.scalar_one_or_none()

    async def list_by_task(self, task_id: uuid.UUID) -> list[Comment]:
        r = await self._session.execute(
            select(Comment).where(Comment.task_id == task_id).order_by(Comment.created_at)
        )
        return list(r.scalars().all())

    async def create(self, task_id: uuid.UUID, user_id: uuid.UUID, body: str) -> Comment:
        c = Comment(task_id=task_id, user_id=user_id, body=body)
        self._session.add(c)
        await self._session.flush()
        await self._session.refresh(c)
        return c

    async def delete(self, comment: Comment) -> None:
        await self._session.delete(comment)
