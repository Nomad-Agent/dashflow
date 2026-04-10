# DashFlow — MVP scope (v1)

**Locked for greenfield rebuild (2026-04).** Phase 2 items must not block v1.

## In scope (v1)

- **Auth:** Access JWT (Bearer) + refresh httpOnly cookie on API host; WebSocket auth per `specs/websocket-protocol.md` (implement register/login/refresh after stubs).
- **Core entities:** User, workspace, project, task, comment (implement incrementally; `users` table + migrations started).
- **Collaboration:** **WebSockets** on MVP (live updates protocol v1 — start with connect + echo; domain events next).
- **Views (frontend):** **Kanban, List, Calendar only.**  
  **Out of v1:** Gantt, Table, and any other views.
- **Hosting:** Frontend **Vercel** (Git build). Backend **Render** Docker (staging + production stacks). DB: **Render Postgres** (staging/prod), **Neon** (local + CI only).
- **Lean product:** **No** file attachments (no S3/R2 in v1). **No** outbound email (password reset / invites = Phase 2).

## Phase 2 (explicitly out of v1)

- Gantt, Table views  
- File attachments, email (reset/invite)  
- BFF-only auth (optional later); richer compliance stories  
- Redis horizontal WS scaling (until needed)  
- GHCR image pull for Render (optional)

## References

- Deployment and agents: root `README.md`, `AGENTS.md`  
- OpenAPI: `specs/openapi.yaml`  
- WS: `specs/websocket-protocol.md`
