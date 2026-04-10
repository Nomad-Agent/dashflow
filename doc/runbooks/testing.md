# Testing & QA runbook

This runbook defines how to validate DashFlow safely and repeatedly across local development and CI.

## Objectives

- Catch regressions in auth and authorization boundaries early.
- Keep backend and frontend behavior aligned with [`../specs/openapi.yaml`](../specs/openapi.yaml).
- Make test signals actionable (deterministic, fast enough, and required in CI).

## Current baseline

- Backend includes API integration tests for auth lifecycle, authorization boundaries, and core CRUD happy path.
- Frontend includes Vitest + Testing Library unit/component tests for auth provider, route guard, and API client helpers.
- Contract checks run via CI job on `doc/specs/openapi.yaml`.

## Local test commands

### Backend

```bash
cd backend
uv sync --all-extras
uv run ruff check app tests
uv run pytest -q
```

### Frontend

```bash
cd frontend
npm ci
npm run test:ci
npm run lint
npm run build
npm run check:types-generated
```

## Database strategy for tests

DashFlow uses a hybrid strategy:

- **Local integration tests:** can use Neon test branch via `DATABASE_URL_TEST`.
- **CI integration tests:** run against ephemeral Postgres service container in GitHub Actions.

`backend/tests/conftest.py` maps `DATABASE_URL_TEST` to `DATABASE_URL` when needed.

## Priority test matrix (implemented baseline)

1. **Auth lifecycle**
   - register → login → refresh → logout
   - invalid credentials, missing refresh cookie
2. **Authorization boundaries**
   - workspace membership checks on workspace/project/task routes
   - comment ownership checks for edit/delete
3. **Core CRUD path**
   - workspace → project → task → comment happy path

## CI expectations

- Test jobs should be required checks on `main`.
- Any failing test blocks deployment workflows.
- Generated frontend types must remain in sync with OpenAPI.
- Backend CI runs Alembic migrations before pytest to catch schema/migration issues early.

See [`ci-cd.md`](ci-cd.md) for workflow-level details.

## QA smoke checklist (manual)

1. `GET /api/v1/health` returns `{"status":"ok"}`.
2. Register and login from the UI (`/register`, `/login`).
3. Create a workspace from `/dashboard`.
4. Verify project/task/comment API flows via Swagger and/or UI.
5. Open WS connection with access JWT and verify `connected` event.

## Non-goals for this runbook

- Full load/performance testing.
- Browser E2E matrices across all environments.
- Security pentest procedures (tracked separately).
