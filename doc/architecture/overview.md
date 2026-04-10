# Architecture overview

```mermaid
flowchart LR
  Browser[Browser_Vercel_Next]
  API[FastAPI_Render_Docker]
  DB[(PostgreSQL)]
  NeonCI[(Neon_dev_CI)]
  Browser -->|HTTPS_REST_WSS| API
  API -->|staging_prod| DB
  Dev[Local_dev] --> NeonCI
```

- **Browser** loads Next.js from **Vercel**; calls **Render** API (REST + WebSocket).
- **Staging / production** data: **Render PostgreSQL** (one DB per environment).
- **Local / CI:** **Neon** branches — not used for Render runtime.

Layers (backend): **router → service → repository → model**; Pydantic **schemas** for I/O.
