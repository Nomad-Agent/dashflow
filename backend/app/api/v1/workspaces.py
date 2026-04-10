import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead
from app.services.workspace_service import WorkspaceService

router = APIRouter()


def _svc(db: AsyncSession) -> WorkspaceService:
    return WorkspaceService(db)


@router.get("/workspaces", response_model=list[WorkspaceRead])
async def list_workspaces(
    db: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> list[WorkspaceRead]:
    return await _svc(db).list_for_user(current.id)


@router.post("/workspaces", response_model=WorkspaceRead, status_code=201)
async def create_workspace(
    body: WorkspaceCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> WorkspaceRead:
    return await _svc(db).create(current.id, body)


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceRead)
async def get_workspace(
    workspace_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> WorkspaceRead:
    return await _svc(db).get(workspace_id, current.id)
