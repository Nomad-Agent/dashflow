from fastapi import APIRouter

from app.api.v1 import auth, comments, health, me, projects, tasks, workspaces, ws

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(me.router, tags=["users"])
api_router.include_router(workspaces.router, tags=["workspaces"])
api_router.include_router(projects.router, tags=["projects"])
api_router.include_router(tasks.router, tags=["tasks"])
api_router.include_router(comments.router, tags=["comments"])
api_router.include_router(ws.router, tags=["websocket"])
