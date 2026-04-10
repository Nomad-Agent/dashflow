# CI/CD (GitHub Actions)

## Strategy

- **Monorepo path filters** — avoid running heavy jobs when unrelated paths change.
- **Secrets (names only — values in GitHub):**
  - `DATABASE_URL_TEST` — Neon test branch for backend tests / optional migration check
  - `RENDER_DEPLOY_HOOK_PRODUCTION` — optional; used by deploy workflow

## Workflows (intended)

| Workflow | Trigger | Paths (concept) | Jobs |
|----------|---------|-----------------|------|
| `ci.yml` | `pull_request`, `push` to `main` | `backend/**`, `frontend/**`, `doc/specs/**`, workflows | Backend: `uv sync`, ruff, pytest, `docker build`; Frontend: `npm ci`, lint, build; optional: OpenAPI validate |

## Production deploy

- **Render production:** workflow job `curl -fsS -X POST "$RENDER_DEPLOY_HOOK_PRODUCTION"` after tests pass on `main`.
- **Vercel:** usually automatic via Vercel Git integration (no duplicate deploy from Actions unless desired).

## Branch policy

- **`main`:** staging API auto-deploy + CI + (optional) production hook after green CI.

## Contract drift

- When `doc/specs/openapi.yaml` changes, CI should fail if generated frontend types are out of date (add codegen check when Orval/openapi-typescript is wired).
