# DashFlow

**DashFlow** is a **team task workspace** for organizing work across **workspaces**, **projects**, and **tasks**, with **comments** on tasks and **real-time WebSockets** planned as the collaboration layer grows. The v1 product is intentionally lean: **Kanban**, **List**, and **Calendar** views only—no Gantt or spreadsheet-style table in the first release.

## What the application is

- A **multi-tenant-style workspace** model: users belong to workspaces (via membership), projects live inside a workspace, and tasks belong to a project. Comments attach to tasks.
- A **web application** delivered as a **Next.js** frontend and a **FastAPI** backend, talking over a **versioned REST API** (`/api/v1`) and (for live features) a **WebSocket** endpoint authenticated with the same access JWT as the REST API.
- An **MVP (v1)** rebuild: auth, core CRUD for the domain above, WS scaffolding, and three UI modes for viewing tasks—aligned with [`doc/MVP-SCOPE.md`](doc/MVP-SCOPE.md).

## What it does (for users and operators)

| Area | Behavior |
|------|----------|
| **Identity** | Users **register** and **sign in**. The API issues a short-lived **access JWT** (Bearer) and sets an **httpOnly refresh cookie** on the API host so the SPA can obtain new access tokens without storing long-lived secrets in `localStorage`. |
| **Workspaces** | Signed-in users **create workspaces** and **list** those they belong to. Each workspace has a stable **slug** (for URLs and display) and enforces access through **workspace membership**. |
| **Projects** | Inside a workspace, users **list/create/update/delete projects** (ordering and metadata like description/color are supported for UI polish). |
| **Tasks** | Per project, users **list/create/update/delete tasks** with **status**, **priority**, **dates**, **assignee**, and **position** (for Kanban ordering). |
| **Comments** | On a task, users **add** comments; authors may **edit or delete** their own comments. |
| **Live updates** | **WebSocket** (`/api/v1/ws?token=…`) verifies the access JWT; the protocol is documented in [`doc/specs/websocket-protocol.md`](doc/specs/websocket-protocol.md) (v1 includes connect + echo; domain events come next). |
| **Deployment shape** | **Frontend:** Vercel (Git-based build). **Backend:** Render (Docker). **Database:** PostgreSQL—**Neon** for local/CI-style URLs, **Render Postgres** for staging/production when wired. |

## Repository layout

| Path | Role |
|------|------|
| `backend/` | FastAPI app under `backend/app/` (routers → services → repositories → models). Alembic migrations, `uv` + `pyproject.toml`. |
| `frontend/` | Next.js 14 App Router, TypeScript, Tailwind, TanStack Query. |
| `doc/` | Product scope, **OpenAPI** contract, WS protocol, architecture notes, runbooks. |
| [`AGENTS.md`](AGENTS.md) | How AI assistants should work in this repo (roles, constraints, prompt snippets). |
| [`CONTEXT.md`](CONTEXT.md) | **Living context** for agents and humans—update when behavior or architecture materially changes. |

## Prerequisites

- Python **3.12+**, [`uv`](https://docs.astral.sh/uv/)
- Node **18+**, npm
- **PostgreSQL** — [Neon](https://neon.tech) recommended locally; use `postgresql+asyncpg://...` URLs (plain `postgresql://` is normalized for async SQLAlchemy).

## Local development (single source of truth)

### Backend

```bash
cd backend
cp .env.example .env
# Set DATABASE_URL_DEV (or DATABASE_URL) — async Neon URL, e.g. postgresql+asyncpg://...
uv sync --all-extras
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Health:** `GET http://localhost:8000/api/v1/health` → `{"status":"ok"}`
- **Swagger:** `http://localhost:8000/api/v1/docs`
- **OpenAPI JSON:** `http://localhost:8000/api/v1/openapi.json` — keep [`doc/specs/openapi.yaml`](doc/specs/openapi.yaml) aligned when the contract changes (or add an export script later).
- **WebSocket:** `ws://localhost:8000/api/v1/ws?token=<access_jwt>` — see [`doc/specs/websocket-protocol.md`](doc/specs/websocket-protocol.md)

**Ports:** API defaults to **8000**.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

- After `npm run dev`, the terminal should show **“Ready”** and **stay running** (no shell prompt). Open the **Local** URL it prints (usually `http://localhost:3000`). Use **Ctrl+C** only when you want to stop the dev server.
- If **port 3000 is already in use**, Next.js may bind to **3001** instead—read the **Local:** line in the output.
- From Windows/WSL or if the browser cannot reach `localhost`, try `npm run dev:host` (listens on `0.0.0.0`).
- **App:** `http://localhost:3000` (or the port shown in the terminal).
- Set **`NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`**

### Environment variables (backend)

| Variable | Use |
|----------|-----|
| `DATABASE_URL` | Used on Render / single-URL setups; wins if set. |
| `DATABASE_URL_DEV` | Local dev when `DATABASE_URL` is unset. |
| `DATABASE_URL_TEST` | **CI / pytest** when tests need a DB (see `backend/tests/conftest.py`; optional GitHub secret). |

Production DB on Render is injected as `DATABASE_URL` when you deploy—no need for a local prod URL.

### Manual smoke checks

1. `GET /api/v1/health` returns `ok`.
2. Open `/api/v1/docs`, try **register** → **login**.
3. With a valid access JWT, open a WS to `/api/v1/ws?token=...` and see a `connected` message.

### Docker (API only)

```bash
cp backend/.env.example backend/.env   # fill DATABASE_URL or DATABASE_URL_DEV
docker compose up --build api
```

Frontend is **not** run in Docker for production (Vercel builds from Git). Details: [`doc/architecture/containers.md`](doc/architecture/containers.md).

## Documentation index

| Doc | Purpose |
|-----|---------|
| [`doc/README.md`](doc/README.md) | Spec index (OpenAPI, WS, MVP scope) |
| [`AGENTS.md`](AGENTS.md) | Agent roles, constraints, copy-paste prompts |
| [`CONTEXT.md`](CONTEXT.md) | Current product/engineering context (maintain after material changes) |
| [`doc/runbooks/deployment.md`](doc/runbooks/deployment.md) | Render + Vercel when you deploy |
| [`doc/runbooks/ci-cd.md`](doc/runbooks/ci-cd.md) | GitHub Actions |
| [`doc/runbooks/testing.md`](doc/runbooks/testing.md) | QA strategy, test commands, and validation checklist |

## CI

GitHub Actions: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (path-filtered). Secret **`DATABASE_URL_TEST`** for DB-backed tests when you add them.

## Version control

Single Git repo at the **repository root** (not inside `frontend/`).
