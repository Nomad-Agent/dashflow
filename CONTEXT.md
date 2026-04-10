# DashFlow — engineering context (living document)

**Purpose:** Give agents and humans a **single, maintainable snapshot** of what DashFlow is today, where truth lives, and what to update when code changes.  
**Rule:** After any **material** change (new endpoints, migrations, auth behavior, main UI routes, CI requirements), **update this file in the same PR or session** unless the user asks otherwise.

---

## Product (one paragraph)

DashFlow is a **team task workspace**: users join **workspaces**, organize work into **projects**, track **tasks** (status, priority, dates, assignee, Kanban position), and discuss via **task comments**. The v1 UI exposes **Kanban**, **List**, and **Calendar** only. **WebSockets** are authenticated with the same access JWT as REST; the protocol is versioned and currently includes connect + echo until domain events land.

---

## Canonical sources of truth

| Topic | Document / location |
|--------|---------------------|
| MVP boundaries | [`doc/MVP-SCOPE.md`](doc/MVP-SCOPE.md) |
| REST contract | [`doc/specs/openapi.yaml`](doc/specs/openapi.yaml) |
| WebSocket protocol | [`doc/specs/websocket-protocol.md`](doc/specs/websocket-protocol.md) |
| Frontend UX & stack | [`doc/specs/frontend-spec.md`](doc/specs/frontend-spec.md) |
| Local dev & env | [`README.md`](README.md) |
| Agent behavior | [`AGENTS.md`](AGENTS.md) |
| This snapshot | **`CONTEXT.md`** (root) |

---

## Repository map

| Path | Contents |
|------|----------|
| `backend/app/api/` | FastAPI routers (`v1`: health, auth, me, workspaces, projects, tasks, comments, ws) |
| `backend/app/services/` | Orchestration, authorization, domain rules |
| `backend/app/repositories/` | Async data access |
| `backend/app/models/` | SQLAlchemy models |
| `backend/app/schemas/` | Pydantic request/response models |
| `backend/app/core/` | Settings, JWT/password security |
| `backend/alembic/versions/` | Migrations (`001_initial` users, `002_domain` workspace graph) |
| `frontend/src/app/` | App Router pages (auth, dashboard, `w/[workspaceId]/...`) |
| `frontend/src/lib/` | API client helpers, types |
| `doc/` | Specs, architecture, runbooks |

---

## Runtime & auth (current)

- **API base:** `/api/v1` (see `backend/app/main.py` include).
- **Access token:** JWT Bearer (`Authorization: Bearer …`), short-lived; payload includes `typ: access`.
- **Refresh token:** JWT in **httpOnly** cookie, path `/api/v1/auth`; `POST /auth/refresh` returns new access token; `POST /auth/logout` clears cookie.
- **CORS:** Configurable via settings; credentials enabled for cookie auth.
- **DB URL:** `DATABASE_URL` **or** `DATABASE_URL_DEV`; plain `postgresql://` URLs are normalized to **`postgresql+asyncpg://`** for the async engine. Tests may use `DATABASE_URL_TEST` via `backend/tests/conftest.py`.
- **WebSocket:** `GET /api/v1/ws?token=<access_jwt>`; must validate `typ: access`.

---

## Data model (high level)

- **User** — email, password hash, name.
- **Workspace** — name, unique slug; **WorkspaceMember** ties user to workspace with role (`owner` / `admin` / `member`).
- **Project** — belongs to workspace; name, description, color, sort_order.
- **Task** — belongs to project; title, description, status, priority, dates, assignee, created_by, position.
- **Comment** — belongs to task and user; body; author can edit/delete own comment.

---

## Frontend routes (v1)

| Route | Role |
|-------|------|
| `/login`, `/register` | Auth forms |
| `/dashboard` | Workspace list + create workspace |
| `/w/[workspaceId]` | Project list for workspace |
| `/w/.../projects/[projectId]/kanban` | Kanban by status |
| `.../list` | Tabular list |
| `.../calendar` | Due-date-oriented month grid |

Client state: access token in memory (React context); refresh on load via cookie.

---

## CI / tooling

- **Backend:** `uv sync`, `ruff`, `alembic upgrade head`, `pytest`, Docker image build (`backend/Dockerfile` from repo root). CI uses ephemeral Postgres service.
- **Frontend:** `npm ci`, `test:ci` (Vitest), `lint`, `build` with `NEXT_PUBLIC_API_URL` set for build.
- **OpenAPI** `info.version` should move with meaningful contract changes (track here).

**OpenAPI spec version (doc):** `0.2.0` (last known sync with implemented REST surface).

---

## Known gaps / next chunks (non-exhaustive)

- Richer **WS domain events** (invalidate/query sync beyond echo).
- Complete coverage for UI edit/delete flows across all task attributes (currently baseline create/status/comment flows exist).
- **Refresh rotation / revocation** if product requires stricter session security.
- **E2E** browser tests (Playwright) to complement current integration/unit coverage.

*Agents: append or trim this section as the codebase evolves.*

---

## Changelog (high level)

| Period | Notes |
|--------|--------|
| 2026-04 | Greenfield monorepo: JWT + cookie auth, workspace graph API, Alembic `002_domain`, Next.js MVP routes (Kanban/List/Calendar), expanded OpenAPI, root git repo. |
| 2026-04-09 | README product narrative; AGENTS.md prompt snippets + principles; added this CONTEXT.md for agent/human maintenance. |
| 2026-04-10 | Added QA/testing agent guidance, `.cursor` QA rule, and dedicated testing runbook with local/CI strategy notes. |
| 2026-04-10 | Implemented QA baseline: backend auth/authz integration tests, frontend Vitest baseline, CI test gates with Postgres service and migration step. |
| 2026-04-10 | Gap-hardening phase: UI write flows for project/task/comment, project-view WS client integration, and release docs hardening. |

---

*Last updated: 2026-04-10 — align this date when you edit materially.*
