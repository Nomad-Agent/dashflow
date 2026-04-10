import type { ProjectRead, TaskRead, UserRead, WorkspaceRead } from "@/lib/types";

/** REST API base, e.g. http://localhost:8000/api/v1 — no trailing slash. */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return url.replace(/\/$/, "");
}

/** WebSocket URL for the API (see doc/specs/frontend-spec.md). */
export function getWsUrl(): string {
  const base = getApiBaseUrl();
  const u = new URL(base);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = u.pathname.replace(/\/$/, "") + "/ws";
  u.search = "";
  u.hash = "";
  return u.toString();
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${getApiBaseUrl()}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function apiJson<T>(
  path: string,
  opts: { method?: string; body?: unknown; token: string | null },
): Promise<T> {
  const { method = "GET", body, token } = opts;
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<{ access_token: string; user: UserRead }> {
  return apiJson("/auth/login", {
    method: "POST",
    body: { email, password },
    token: null,
  });
}

export async function registerRequest(
  email: string,
  password: string,
  name: string,
): Promise<{ access_token: string; user: UserRead }> {
  return apiJson("/auth/register", {
    method: "POST",
    body: { email, password, name },
    token: null,
  });
}

export async function fetchWorkspaces(token: string): Promise<WorkspaceRead[]> {
  return apiJson("/workspaces", { token });
}

export async function createWorkspace(token: string, name: string): Promise<WorkspaceRead> {
  return apiJson("/workspaces", { method: "POST", body: { name }, token });
}

export async function fetchProjects(token: string, workspaceId: string): Promise<ProjectRead[]> {
  return apiJson(`/workspaces/${workspaceId}/projects`, { token });
}

export async function fetchTasks(token: string, projectId: string): Promise<TaskRead[]> {
  return apiJson(`/projects/${projectId}/tasks`, { token });
}
