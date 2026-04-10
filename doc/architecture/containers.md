# Containers

## Production

- **Only the FastAPI API** is deployed as a **Docker** image on **Render**.
- **Next.js on Vercel** is **not** deployed via Docker; Vercel builds from Git.

## Dockerfile

- **Path:** `backend/Dockerfile`
- **Build context:** **repository root** (so `COPY backend/` works).
- **Command:** `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}` (Render sets `PORT`).
- **Health:** `GET /api/v1/health` — Docker `HEALTHCHECK` uses this.

## Local Compose

- **`docker-compose.yml`** at repo root builds the API image.
- Typical local DB: **Neon** via `backend/.env` (optional `postgres` service commented in compose).

## Optional frontend Dockerfile

- Not used by Vercel. Add later only for local prod-like or E2E if needed; label as non-Vercel.

## Migrations on Render

- Use **release** or **pre-deploy** command: e.g. `alembic upgrade head` (run inside image context with `DATABASE_URL`).

## WebSockets

- Single long-lived process per instance; **one worker** recommended for WS simplicity until Redis/pub-sub is introduced.
