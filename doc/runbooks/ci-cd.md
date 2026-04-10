# CI/CD (GitHub Actions)

## Strategy

- **Monorepo path filters** — avoid running heavy jobs when unrelated paths change.
- **Secrets (names only — values in GitHub):**
  - `DATABASE_URL_TEST` — optional for local/dev integration checks; CI currently uses ephemeral Postgres service
  - `RENDER_DEPLOY_HOOK_PRODUCTION` — required only when production deploy is hook-driven from Actions

## Workflows (intended)

| Workflow | Trigger | Paths (concept) | Jobs |
|----------|---------|-----------------|------|
| `ci.yml` | `pull_request`, `push` to `main` | `backend/**`, `frontend/**`, `doc/specs/**`, workflows | Backend: `uv sync`, ruff, `alembic upgrade head`, pytest against Postgres service, `docker build`; Frontend: `npm ci`, `test:ci`, lint, build; Contract: OpenAPI lint + generated type sync check |

## Production deploy

- **Render production:** workflow job `curl -fsS -X POST "$RENDER_DEPLOY_HOOK_PRODUCTION"` after tests pass on `main`.
- **Vercel:** usually automatic via Vercel Git integration (no duplicate deploy from Actions unless desired).

## Required checks on `main`

Recommended branch protection required checks:

- `backend` (ruff + alembic + pytest + docker build)
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
  - `DATABASE_URL_TEST` can back local integration tests.
  - CI uses ephemeral Postgres service containers for deterministic DB-backed tests.

## Secrets matrix (required vs optional)

| Secret | Where | Required | Purpose |
|--------|-------|----------|---------|
| `DATABASE_URL_TEST` | Local shell / optional GitHub env | Optional | Local integration test override; CI currently uses service DB. |
| `RENDER_DEPLOY_HOOK_PRODUCTION` | GitHub Environment: production | Conditional | Trigger production deploy from Actions after green checks. |
| `NEXT_PUBLIC_API_URL` | Vercel project env + CI build env | Required | Frontend build/runtime API base URL. |
