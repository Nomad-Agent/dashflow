# DashFlow — multi-agent roles (Cursor)

There are no separate AI “accounts.” Use **roles** in new Chat/Composer sessions or rely on **`.cursor/rules`** when editing matching paths.

## Roles

| Role | Scope | Read first |
|------|--------|------------|
| **Docs / spec** | `doc/**`, OpenAPI, runbooks | [`doc/README.md`](doc/README.md), [`doc/MVP-SCOPE.md`](doc/MVP-SCOPE.md) |
| **Backend** | `backend/**` | [`doc/specs/openapi.yaml`](doc/specs/openapi.yaml), [`doc/architecture/containers.md`](doc/architecture/containers.md), [`doc/specs/websocket-protocol.md`](doc/specs/websocket-protocol.md) |
| **Frontend** | `frontend/**` | [`doc/specs/frontend-spec.md`](doc/specs/frontend-spec.md), OpenAPI (types), websocket protocol |
| **CI/CD** | `.github/**` | [`doc/runbooks/ci-cd.md`](doc/runbooks/ci-cd.md) |

## One session vs many

- **Single Agent session:** Run the full plan in order (docs → backend → frontend → CI) in one Composer thread.
- **Parallel focus:** Open a **new** chat and paste a role prompt, e.g.  
  *“You are the DashFlow **backend** implementer. Follow `doc/specs/openapi.yaml` and `backend/app` layout; do not change the API contract without updating `doc/`.”*

## Governance

- **Architecture owner (you):** Render/Vercel, secrets, branch policy, final QA.
- **Contract:** `doc/specs/openapi.yaml` + `doc/specs/websocket-protocol.md` — coordinate changes in `doc/`.

## Prompt snippets (copy-paste)

**Backend:**  
`Implement against doc/specs/openapi.yaml. Stack: FastAPI, SQLAlchemy async, Alembic, layered app under backend/app (api → services → repositories). No business logic in routers.`

**Frontend:**  
`Next.js App Router, TanStack Query, TypeScript. MVP views: Kanban, List, Calendar only. REST + WS per doc/specs. Generate or sync types from OpenAPI.`

**CI/CD:**  
`GitHub Actions with path filters per doc/runbooks/ci-cd.md. Secrets names only in docs — never commit values.`
