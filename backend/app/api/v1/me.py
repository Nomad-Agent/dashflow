from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def read_me(current: Annotated[User, Depends(get_current_user)]) -> UserRead:
    return UserRead.model_validate(current)
