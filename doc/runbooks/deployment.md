# Deployment runbook

## Render (two stacks)

1. Create **staging** Web Service + **staging** PostgreSQL; link DB; set `CORS_ORIGINS`, `JWT_SECRET_KEY`, etc.
2. Create **production** Web Service + **production** PostgreSQL; same env pattern; **disable auto-deploy** for production if using hook-only workflow.
3. **Docker (monorepo):** choose **one** layout:
   - **A (recommended):** Root Directory = **empty** (repo root), Dockerfile Path = **`Dockerfile`**, Docker Build Context = **`.`** (uses root [`Dockerfile`](../../Dockerfile)).
   - **B (Render “Root Directory = backend”):** Root Directory = **`backend`**, Dockerfile Path = **`Dockerfile`**, Docker Build Context = **`.`** (uses [`backend/Dockerfile`](../../backend/Dockerfile) with context `backend/`).
4. **Release command:** `alembic upgrade head` (image `WORKDIR` is `/app`, same as repo `backend/` contents; no `cd` needed).

## Staging vs production triggers

- **Staging:** Git integration — auto-deploy **`main`**.
- **Production:** GitHub Action calls **Render deploy hook** after CI passes on `main`.

Store hook URLs in GitHub **environment** secrets (e.g. `RENDER_DEPLOY_HOOK_PRODUCTION`).

## Vercel

- Connect Git repo; set **Production** and **Preview** `NEXT_PUBLIC_API_URL` per `runtime-environments.md`.

## First-time checklist

- [ ] Neon branches for dev + test CI
- [ ] Render staging + prod services and DBs
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
