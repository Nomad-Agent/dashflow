import re
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import WorkspaceRole
from app.repositories.workspace_member_repository import WorkspaceMemberRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead


def _slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "workspace"


class WorkspaceService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._workspaces = WorkspaceRepository(session)
        self._members = WorkspaceMemberRepository(session)

    async def _require_member(self, workspace_id: uuid.UUID, user_id: uuid.UUID):
        m = await self._members.get_membership(workspace_id, user_id)
        if not m:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not a workspace member")
        return m

    async def _unique_slug(self, base: str) -> str:
        slug = base
        while await self._workspaces.slug_exists(slug):
            slug = f"{base}-{uuid.uuid4().hex[:8]}"
        return slug

    async def list_for_user(self, user_id: uuid.UUID) -> list[WorkspaceRead]:
        rows = await self._workspaces.list_for_user(user_id)
        return [WorkspaceRead.model_validate(w) for w in rows]

    async def create(self, user_id: uuid.UUID, body: WorkspaceCreate) -> WorkspaceRead:
        base = _slugify(body.slug or body.name)
        slug = await self._unique_slug(base)
        ws = await self._workspaces.create(name=body.name, slug=slug)
        await self._members.add(ws.id, user_id, WorkspaceRole.owner.value)
        await self._session.commit()
        await self._session.refresh(ws)
        return WorkspaceRead.model_validate(ws)

    async def get(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceRead:
        await self._require_member(workspace_id, user_id)
        ws = await self._workspaces.get_by_id(workspace_id)
        if not ws:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Workspace not found")
        return WorkspaceRead.model_validate(ws)

    async def touch_updated(self, workspace_id: uuid.UUID) -> None:
        ws = await self._workspaces.get_by_id(workspace_id)
        if ws:
            ws.updated_at = datetime.now(UTC)
            await self._session.flush()
