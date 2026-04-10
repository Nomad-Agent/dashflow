# DashFlow — Frontend specification (v1)

## Stack

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- **TanStack Query** for server state
- **OpenAPI-driven types** — generate from `doc/specs/openapi.yaml` (e.g. `openapi-typescript`) in CI or on demand

## MVP routes (v1)

- Auth: login, register (forgot/reset email = Phase 2)
- Workspace dashboard entry
- Project views: **Kanban**, **List**, **Calendar** only  
- **Do not** ship Gantt or Table routes in v1

## Environment

- `NEXT_PUBLIC_API_URL` — REST base including `/api/v1` (e.g. `http://localhost:8000/api/v1`)
- Derive WS base from API origin: `http` → `ws`, `https` → `wss`, same host, path `/api/v1/ws`

## REST client

- Use `fetch` or axios with **`credentials: 'include'`** so refresh cookie (API domain) is sent on refresh calls when implemented.

## WebSocket client

- Single module: connect with `?token=`, reconnect with backoff, handle `connected` and future domain events.

## State

- UI state: React state or light store as needed
- Server state: TanStack Query; invalidate on WS events when implemented
