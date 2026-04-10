import pytest
from httpx import AsyncClient


async def _register_user(client: AsyncClient, email: str, password: str = "strongpass123") -> None:
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": email.split("@")[0]},
    )
    assert r.status_code == 201


async def _login_token(client: AsyncClient, email: str, password: str = "strongpass123") -> str:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_requires_auth_for_workspaces(api_client: AsyncClient) -> None:
    r = await api_client.get("/api/v1/workspaces")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_workspace_project_task_comment_authorization(api_client: AsyncClient) -> None:
    # user A owns workspace and creates project/task/comment
    await _register_user(api_client, "owner@example.com")
    owner_token = await _login_token(api_client, "owner@example.com")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    ws = await api_client.post(
        "/api/v1/workspaces",
        json={"name": "Owner Workspace"},
        headers=owner_headers,
    )
    assert ws.status_code == 201
    workspace_id = ws.json()["id"]

    project = await api_client.post(
        f"/api/v1/workspaces/{workspace_id}/projects",
        json={"name": "Core"},
        headers=owner_headers,
    )
    assert project.status_code == 201
    project_id = project.json()["id"]

    task = await api_client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={"title": "Initial task"},
        headers=owner_headers,
    )
    assert task.status_code == 201
    task_id = task.json()["id"]

    comment = await api_client.post(
        f"/api/v1/tasks/{task_id}/comments",
        json={"body": "Owner note"},
        headers=owner_headers,
    )
    assert comment.status_code == 201
    comment_id = comment.json()["id"]

    # user B is not member -> cannot access workspace-scoped resources
    await _register_user(api_client, "outsider@example.com")
    outsider_token = await _login_token(api_client, "outsider@example.com")
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}

    forbidden_ws = await api_client.get(f"/api/v1/workspaces/{workspace_id}", headers=outsider_headers)
    assert forbidden_ws.status_code == 403

    forbidden_projects = await api_client.get(
        f"/api/v1/workspaces/{workspace_id}/projects",
        headers=outsider_headers,
    )
    assert forbidden_projects.status_code == 403

    forbidden_task_read = await api_client.get(f"/api/v1/tasks/{task_id}", headers=outsider_headers)
    assert forbidden_task_read.status_code == 403

    forbidden_comments = await api_client.get(
        f"/api/v1/tasks/{task_id}/comments",
        headers=outsider_headers,
    )
    assert forbidden_comments.status_code == 403

    forbidden_comment_edit = await api_client.patch(
        f"/api/v1/comments/{comment_id}",
        json={"body": "Intrusion"},
        headers=outsider_headers,
    )
    assert forbidden_comment_edit.status_code == 403

    forbidden_comment_delete = await api_client.delete(
        f"/api/v1/comments/{comment_id}",
        headers=outsider_headers,
    )
    assert forbidden_comment_delete.status_code == 403


@pytest.mark.asyncio
async def test_core_crud_happy_path(api_client: AsyncClient) -> None:
    await _register_user(api_client, "builder@example.com")
    token = await _login_token(api_client, "builder@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    ws = await api_client.post("/api/v1/workspaces", json={"name": "Build WS"}, headers=headers)
    assert ws.status_code == 201
    workspace_id = ws.json()["id"]

    project = await api_client.post(
        f"/api/v1/workspaces/{workspace_id}/projects",
        json={"name": "Project X"},
        headers=headers,
    )
    assert project.status_code == 201
    project_id = project.json()["id"]

    task = await api_client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={"title": "Task X"},
        headers=headers,
    )
    assert task.status_code == 201
    task_id = task.json()["id"]

    comment = await api_client.post(
        f"/api/v1/tasks/{task_id}/comments",
        json={"body": "Looks good"},
        headers=headers,
    )
    assert comment.status_code == 201

    list_tasks = await api_client.get(f"/api/v1/projects/{project_id}/tasks", headers=headers)
    assert list_tasks.status_code == 200
    assert len(list_tasks.json()) == 1

    list_comments = await api_client.get(f"/api/v1/tasks/{task_id}/comments", headers=headers)
    assert list_comments.status_code == 200
    assert len(list_comments.json()) == 1
