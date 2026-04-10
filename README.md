# DashFlow

Task workspace monorepo: **FastAPI** (`backend/`), **Next.js** (`frontend/`), product and API specs in **`doc/`**.

## What it is

- **MVP (v1):** auth, workspaces, projects, tasks, comments, WebSockets; UI views **Kanban, List, Calendar** only (see [`doc/MVP-SCOPE.md`](doc/MVP-SCOPE.md)).
- **Stack:** PostgreSQL (Neon for local/CI, Render Postgres for staging/prod), JWT access token + httpOnly refresh cookie on the API host, Vercel + Render for deploy (when wired).

## Prerequisites

- Python **3.12+**, [`uv`](https://docs.astral.sh/uv/)
- Node **18+**, npm
- **PostgreSQL** — [Neon](https://neon.tech) recommended; use `postgresql+asyncpg://...` URLs

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

- **App:** `http://localhost:3000` (see `frontend/package.json` if the dev port differs).
- Set **`NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`**

### Environment variables (backend)

| Variable | Use |
|----------|-----|
| `DATABASE_URL` | Used on Render / single-URL setups; wins if set. |
| `DATABASE_URL_DEV` | Local dev when `DATABASE_URL` is unset. |
| `DATABASE_URL_TEST` | **CI / pytest** when tests need a DB (set in GitHub Actions). |

Production DB on Render is injected as `DATABASE_URL` when you deploy — no need for a local prod URL.

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

## Documentation and Cursor

| Doc | Purpose |
|-----|---------|
| [`doc/README.md`](doc/README.md) | Spec index (OpenAPI, WS, MVP scope) |
| [`AGENTS.md`](AGENTS.md) | Backend / Frontend / CI roles in Cursor |
| [`doc/runbooks/deployment.md`](doc/runbooks/deployment.md) | Render + Vercel when you deploy |
| [`doc/runbooks/ci-cd.md`](doc/runbooks/ci-cd.md) | GitHub Actions |

## CI

GitHub Actions: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (path-filtered). Secret **`DATABASE_URL_TEST`** for DB-backed tests when you add them.

## Version control

Single Git repo at the **repository root** (not inside `frontend/`).
