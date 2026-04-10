# DashFlow API

FastAPI + SQLAlchemy (async) + Alembic. See repo root `README.md` and `doc/` for specs.

```bash
uv sync --extra dev
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

OpenAPI: served at `/api/v1/openapi.json` (and `/docs` for Swagger UI in development).
