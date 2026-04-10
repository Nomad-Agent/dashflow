# DashFlow — WebSocket protocol (v1)

## Endpoint

- **URL:** same host as REST, path **`/api/v1/ws`**
- **Example:** `wss://<api-host>/api/v1/ws?token=<access_jwt>`

## Authentication (MVP)

1. Client obtains **access JWT** via REST (when login is implemented).
2. On `WebSocket` connect, pass the access token as query parameter **`token`**.
3. Server validates JWT (signature, expiry). On failure, connection closes with code **4401** (custom; clients should treat as unauthorized).

**Note:** Query-string tokens can appear in logs/proxies; acceptable for MVP with short TTL. Phase 2 may add ticket exchange or `Sec-WebSocket-Protocol`.

## First server message

After `accept`, server sends JSON:

```json
{ "type": "connected", "protocol": "dashflow-ws-v1" }
```

## Echo (bootstrap)

Until domain events land, server **echoes** JSON messages:

```json
{ "type": "echo", "payload": <client_payload> }
```

## Future events (document when added)

Examples (not all implemented yet): `task.updated`, `comment.created` — include `workspace_id` / `project_id` for routing and TanStack Query invalidation.

## Versioning

Bump `protocol` string when breaking message shapes.
