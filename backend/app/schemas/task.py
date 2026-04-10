import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.none
    due_date: date | None = None
    start_date: date | None = None
    assignee_id: uuid.UUID | None = None
    position: int = 0


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None
    start_date: date | None = None
    assignee_id: uuid.UUID | None = None
    position: int | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None
    status: str
    priority: str
    due_date: date | None
    start_date: date | None
    assignee_id: uuid.UUID | None
    created_by_id: uuid.UUID | None
    position: int
    created_at: datetime
    updated_at: datetime
