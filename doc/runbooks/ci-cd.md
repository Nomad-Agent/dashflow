# CI/CD (GitHub Actions)

## Strategy

- **Monorepo path filters** — avoid running heavy jobs when unrelated paths change.
- **Secrets (names only — values in GitHub):**
  - `DATABASE_URL_TEST` — local/dev integration test target when you run pytest against a dedicated database such as a Neon test branch
  - `RENDER_DEPLOY_HOOK_PRODUCTION` — required only when production deploy is hook-driven from Actions

## Workflows (intended)

| Workflow | Trigger | Paths (concept) | Jobs |
|----------|---------|-----------------|------|
| `ci.yml` | `pull_request`, `push` to `main` | `backend/**`, `frontend/**`, `doc/specs/**`, workflows | Backend: `uv sync`, ruff, `alembic upgrade head`, pytest against Postgres service, `docker build -f Dockerfile .`, `docker build -f backend/Dockerfile backend`; Frontend: `npm ci`, `test:ci`, lint, build; Contract: OpenAPI lint + generated type sync check |

## Production deploy

- **Render production:** you can promote via **Render dashboard**, **deploy hook** (manual `curl` or CI), or **Git integration** auto-deploy—pick one model per service. This repo’s `.github/workflows/ci.yml` **does not** POST a deploy hook yet; if you want hook-driven production, add a small workflow (or run the `curl` from your release process) and store `RENDER_DEPLOY_HOOK_PRODUCTION` in GitHub Environments.
- **Vercel:** usually automatic via Vercel Git integration (no duplicate deploy from Actions unless desired).

## Required checks on `main`

Recommended branch protection required checks:

- `backend` (ruff + alembic + pytest + both Docker builds)
- `frontend` (test:ci + lint + build)
- `contract` (OpenAPI lint + generated type sync)

If you rename jobs in workflow YAML, update branch protection names immediately.

## Branch policy

- **`main`:** staging API auto-deploy + CI + (optional) production hook after green CI.

## Contract drift

- When `doc/specs/openapi.yaml` changes, CI must fail if generated frontend types are out of date (`frontend` script `check:types-generated`).

## Testing strategy references

- QA and test scope/runbook: [`testing.md`](testing.md)
- Local/CI DB usage:
  - Local integration tests require a dedicated `DATABASE_URL_TEST`; the harness rewires `DATABASE_URL` to that value before importing the app.
  - CI uses an ephemeral Postgres service container and sets both `DATABASE_URL` and `DATABASE_URL_TEST` to that service for parity with the Alembic bootstrap path.

## Secrets matrix (required vs optional)

| Secret | Where | Required | Purpose |
|--------|-------|----------|---------|
| `DATABASE_URL_TEST` | Local shell / optional GitHub env | Optional | Dedicated local integration-test database; CI currently injects the service DB directly in workflow env. |
| `RENDER_DEPLOY_HOOK_PRODUCTION` | GitHub Environment: production | Conditional | Trigger production deploy from Actions after green checks. |
| `NEXT_PUBLIC_API_URL` | Vercel project env + CI build env | Required | Frontend build/runtime API base URL. |
