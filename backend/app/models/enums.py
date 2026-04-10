from enum import StrEnum


class WorkspaceRole(StrEnum):
    owner = "owner"
    admin = "admin"
    member = "member"


class TaskStatus(StrEnum):
    todo = "todo"
    in_progress = "in_progress"
    in_review = "in_review"
    done = "done"
    blocked = "blocked"
    cancelled = "cancelled"


class TaskPriority(StrEnum):
    none = "none"
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"
