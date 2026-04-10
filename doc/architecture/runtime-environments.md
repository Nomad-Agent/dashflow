# Runtime environments

## Databases

| Environment | Store | Connection |
|-------------|--------|------------|
| Local dev | **Neon** (dev branch) | `DATABASE_URL` in `backend/.env` (`postgresql+asyncpg://...`) |
| CI (GitHub Actions) | **Neon** (test branch) | Secret `DATABASE_URL_TEST` |
| Staging API (Render) | **Render Postgres** (staging) | Render-injected `DATABASE_URL` on **staging** Web Service |
| Production API (Render) | **Render Postgres** (production) | Render-injected `DATABASE_URL` on **production** Web Service |

## Apps

| Surface | Host | Deploy |
|---------|------|--------|
| Frontend | **Vercel** | Git-connected build (not Docker) |
| API staging | **Render** | Auto-deploy on **`main`** (Dockerfile) |
| API production | **Render** | **Deploy hook** after CI on `main` (no auto-deploy on push) |

## Vercel env alignment

| Vercel target | `NEXT_PUBLIC_API_URL` |
|---------------|------------------------|
| **Production** | Production Render API base …`/api/v1` |
| **Preview** (PRs) | Staging Render API base …`/api/v1` |

## CORS (Render API)

Set `CORS_ORIGINS` to include:

- Production frontend URL(s)
- `https://*.vercel.app` for previews (or explicit preview patterns)

## Secrets

Never commit real URLs or keys. Use Render dashboard, Vercel dashboard, GitHub **Environments** secrets.

### Backend (`backend/.env` — gitignored)

- `DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS`, cookie-related vars as implemented

### Frontend (`.env.local` — gitignored)

- `NEXT_PUBLIC_API_URL`

See `backend/.env.example` and `frontend/.env.local.example`.
