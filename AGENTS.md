# DashFlow — agent guide (Cursor / AI assistants)

Use this file **with** [`.cursor/rules/`](.cursor/rules/) and root [`CONTEXT.md`](CONTEXT.md). **`CONTEXT.md` is the living snapshot**; **`AGENTS.md` is how to work**—read both at the start of a substantive session.

---

## Prime context (read first)

1. [`CONTEXT.md`](CONTEXT.md) — what exists now, canonical paths, “when you change X, update Y.”
2. [`doc/MVP-SCOPE.md`](doc/MVP-SCOPE.md) — v1 boundaries (Kanban/List/Calendar only; no Gantt/Table in v1).
3. **By task type:**
   - API or contract: [`doc/specs/openapi.yaml`](doc/specs/openapi.yaml)
   - Frontend UX: [`doc/specs/frontend-spec.md`](doc/specs/frontend-spec.md)
   - WS: [`doc/specs/websocket-protocol.md`](doc/specs/websocket-protocol.md)
   - Deploy/CI: [`doc/runbooks/deployment.md`](doc/runbooks/deployment.md), [`doc/runbooks/ci-cd.md`](doc/runbooks/ci-cd.md)

---

## Operating principles

- **Contract-first:** REST behavior is defined in **`doc/specs/openapi.yaml`**. Changing public API shape or semantics requires updating that file (and **FastAPI** routes/schemas) in the **same change**, unless the user explicitly defers contract sync.
- **Layered backend:** **`backend/app/api`** → **`services`** → **`repositories`** → **`models`**. Routers validate/translate HTTP only; **no business rules in routers** (orchestration and authorization checks live in services).
- **Thin frontend:** **Next.js App Router**, **TypeScript**, **TanStack Query**, **`credentials: 'include'`** for refresh cookie flows. MVP views: **Kanban, List, Calendar** only.
- **Monorepo root:** One git repo at repo root; do not reintroduce **`frontend/.git`**.
- **Secrets:** Never commit `.env`, tokens, or connection strings. Document **variable names** only in runbooks/examples.
- **After material work:** Update [`CONTEXT.md`](CONTEXT.md) (features, migrations, contract version, known gaps).

---

## Role routing (pick one focus per session)

| Focus | Paths | You must respect |
|-------|--------|------------------|
| **Backend** | `backend/**` | OpenAPI + Alembic; async SQLAlchemy; ruff/pytest before commit |
| **Frontend** | `frontend/**` | `frontend-spec.md`; OpenAPI alignment for types/URLs |
| **QA / Testing** | `backend/tests/**`, `frontend/**`, `.github/**` | Auth + authz coverage for API, deterministic fixtures, CI-enforced test gates |
| **Docs / contract** | `doc/**` | MVP scope; cross-links from README/CONTEXT |
| **CI/CD** | `.github/**`, `docker-compose.yml`, Dockerfiles | `doc/runbooks/ci-cd.md`; path filters |

---

## System-style prompt snippets (copy whole block)

Use as the **first message** or Composer instruction. Replace `{TASK}` with the user’s request.

### Default (full-stack or ambiguous)

```text
You are working on DashFlow, a task workspace monorepo (FastAPI + Next.js + PostgreSQL).

Ground truth: root CONTEXT.md, doc/MVP-SCOPE.md, doc/specs/openapi.yaml.
Backend: backend/app — Router → Service → Repository → Model; no business logic in routers.
Frontend: Next.js App Router, TanStack Query, credentials:include for auth cookie flows; MVP views Kanban/List/Calendar only.

Task: {TASK}

Rules: Minimal scoped diffs; match existing style; do not commit secrets; after API or product-visible behavior changes, update CONTEXT.md and keep openapi.yaml in sync with implementation.
```

### Backend-only

```text
You are the DashFlow backend agent. Stack: Python 3.12+, FastAPI, SQLAlchemy 2 async, Alembic, uv.

Task: {TASK}

Constraints:
- Follow backend/app layering: api → services → repositories → models.
- Public REST contract is doc/specs/openapi.yaml — keep it aligned with code.
- New persistence requires Alembic revision; env URLs: DATABASE_URL or DATABASE_URL_DEV (see README).
- Run: uv run ruff check app tests && uv run pytest -q from backend/ when changing app or tests.

Update CONTEXT.md if you add endpoints, migrations, or auth/security behavior.
```

### Frontend-only

```text
You are the DashFlow frontend agent. Stack: Next.js 14 App Router, TypeScript, Tailwind, TanStack Query.

Task: {TASK}

Constraints:
- REST base: NEXT_PUBLIC_API_URL (includes /api/v1). Use credentials: 'include' for refresh/logout.
- MVP UI: Kanban, List, Calendar only — no Gantt/Table routes in v1 (doc/MVP-SCOPE.md).
- Follow doc/specs/frontend-spec.md; sync with doc/specs/openapi.yaml for paths and payloads.
- Prefer small presentational components; server state in React Query.

Update CONTEXT.md if routes, auth flow, or primary user journeys change materially.
```

### Docs / OpenAPI / specs

```text
You are maintaining DashFlow specifications. Canonical REST contract: doc/specs/openapi.yaml. MVP boundaries: doc/MVP-SCOPE.md.

Task: {TASK}

Constraints:
- OpenAPI changes must stay consistent with backend/app and frontend usage; note breaking vs additive changes.
- Update doc/README.md index if you add major spec files.
- Bump OpenAPI info.version when the contract meaningfully changes; note in CONTEXT.md.
```

### QA / Testing

```text
You are the DashFlow QA/testing agent. Validate behavior, not just compilation.

Task: {TASK}

Constraints:
- Backend: prioritize API tests for auth lifecycle and authorization boundaries (workspace membership, comment ownership).
- Frontend: add deterministic unit/component tests (mock network/time; avoid flaky selectors).
- Keep tests aligned to OpenAPI and MVP scope (Kanban/List/Calendar only).
- CI is a quality gate: tests must run in GitHub Actions and fail fast on regressions.
- Prefer small fixtures/factories and clear arrange/act/assert structure.

Update CONTEXT.md with test coverage baseline, QA gaps, and any temporary test debt.
```

### CI/CD

```text
You are maintaining DashFlow CI/CD. Reference: doc/runbooks/ci-cd.md.

Task: {TASK}

Constraints:
- Path-filter workflows; no secrets in YAML; document secret *names* only.
- Backend CI: uv sync, ruff, pytest, docker build from repo root with backend/Dockerfile.
- Frontend CI: npm ci, lint, build with NEXT_PUBLIC_API_URL set for build-time env.

Update CONTEXT.md if required checks or deploy assumptions change.
```

---

## Anti-patterns (avoid)

- Business logic or authorization **only** in FastAPI routers (except HTTP-specific concerns).
- New frontend views **outside** Kanban/List/Calendar without explicit MVP scope change.
- Duplicating long runbooks in README—**pointer + single source** in `doc/runbooks/`.
- Implementing APIs **not** reflected in OpenAPI without user approval for “undocumented” APIs.

---

## Quick commands

| Where | Command |
|-------|---------|
| Backend | `cd backend && uv sync --all-extras && uv run ruff check app tests && uv run pytest -q` |
| Frontend | `cd frontend && npm run lint && npm run build` |
| QA (frontend tests) | `cd frontend && npm run test` |
| Migrations | `cd backend && uv run alembic revision --autogenerate -m "..."` (review!) then `uv run alembic upgrade head` |

---

## Governance

- **Architecture and secrets:** human owner (Render/Vercel, DB URLs, branch protection).
- **Contract authority:** `doc/specs/openapi.yaml` + `doc/specs/websocket-protocol.md`; large contract shifts need README/CONTEXT notes.
