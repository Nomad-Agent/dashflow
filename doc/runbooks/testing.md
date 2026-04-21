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

DashFlow backend integration tests now use one schema strategy in both local runs and CI:

- pytest requires a dedicated `DATABASE_URL_TEST` locally and fails fast if it is missing or matches `DATABASE_URL`.
- the test harness points `DATABASE_URL` at that safe test target before importing the app.
- Alembic runs once at pytest session startup, so local runs exercise the same migration path CI already uses.
- each test clears application tables after the migrated schema is in place, keeping data isolated without rebuilding the schema every time.

CI still uses an ephemeral Postgres service container, with both `DATABASE_URL` and `DATABASE_URL_TEST` set to that test database for parity.

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
- Backend CI and local pytest both depend on Alembic succeeding before tests execute, so schema drift now fails immediately in either environment.

See [`ci-cd.md`](ci-cd.md) for workflow-level details.

## QA smoke checklist (manual)

1. `GET /api/v1/health` returns `{"status":"ok"}`.
2. Register and login from the UI (`/register`, `/login`).
3. Create a workspace from `/dashboard`.
4. Verify project/task/comment API flows via Swagger and/or UI.
5. Open WS connection with access JWT and verify `connected` event.
6. Verify project views show WS status (`connecting` -> `connected`) and recover after refresh.

## Release QA handoff checklist

- [ ] CI checks (`backend`, `frontend`, `contract`) are green on target commit.
- [ ] Post-deploy smoke checklist executed on staging.
- [ ] If deploying production: rollback path confirmed in `deployment.md`.

## Non-goals for this runbook

- Full load/performance testing.
- Browser E2E matrices across all environments.
- Security pentest procedures (tracked separately).
