# Deployment runbook

## Render (two stacks)

1. Create **staging** Web Service + **staging** PostgreSQL; link DB; set `CORS_ORIGINS`, `JWT_SECRET_KEY`, etc.
2. Create **production** Web Service + **production** PostgreSQL; same env pattern; **disable auto-deploy** for production if using hook-only workflow.
3. **Docker (monorepo):** choose **one** layout:
   - **A (recommended):** Root Directory = **empty** (repo root), Dockerfile Path = **`Dockerfile`**, Docker Build Context = **`.`** (uses root [`Dockerfile`](../../Dockerfile)).
   - **B (Render “Root Directory = backend”):** Root Directory = **`backend`**, Dockerfile Path = **`Dockerfile`**, Docker Build Context = **`.`** (uses [`backend/Dockerfile`](../../backend/Dockerfile) with context `backend/`).
4. **Automate migrations:** use a Blueprint-backed **pre-deploy command** of `alembic upgrade head` so every Render deploy upgrades schema before traffic shifts.
5. **Free-tier fallback:** the API container startup also runs `alembic upgrade head && uvicorn ...` because Render does not execute pre-deploy commands on free instances.
6. Keep the web service health check pointed at **`/api/v1/ready`** so deploys fail fast if the database schema is missing or behind.

## Staging vs production triggers

- **Staging:** Git integration — auto-deploy **`main`**.
- **Production:** GitHub Action calls **Render deploy hook** after CI passes on `main`.

Store hook URLs in GitHub **environment** secrets (e.g. `RENDER_DEPLOY_HOOK_PRODUCTION`).

## Vercel

- Import the Git repo as a **monorepo** project and set **Root Directory = `frontend`** before the first deploy.
- Set **Framework Preset = Next.js**.
- Leave **Output Directory** empty unless you have a deliberate non-Next static export setup. If Vercel is looking for `public`, the project was imported with the wrong framework/root settings.
- Set **Production** and **Preview** `NEXT_PUBLIC_API_URL` per `runtime-environments.md`.

## First-time checklist

- [ ] Neon branches for dev + test CI
- [ ] Render staging + prod services and DBs
- [ ] Render Blueprint synced from [`render.yaml`](../../render.yaml)
- [ ] Vercel env vars
- [ ] GitHub secrets for CI + deploy hook
- [ ] Run migrations on each new environment

## Rollback and failure handling

### Rollback triggers

- Release health check fails after deploy.
- Smoke checks fail for auth or core CRUD paths.
- Elevated 5xx error rate immediately post deploy.

### Rollback steps (production)

1. Pause further deploys (disable hook trigger temporarily).
2. In Render dashboard, rollback to previous healthy deploy.
3. Re-run smoke checks (health, auth, workspace/project/task/comment path, WS connect).
4. Open incident note with failed commit SHA and root-cause summary.

### Post-deploy smoke checklist

- `GET /api/v1/health` returns `ok`.
- Register/login/refresh/logout work.
- Create workspace, project, task, comment from UI flows.
- WS connects on project views and remains stable after navigation.
