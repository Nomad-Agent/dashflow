from pathlib import Path
from typing import Annotated

from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def _expected_alembic_heads() -> set[str]:
    alembic_ini = Path(__file__).resolve().parents[3] / "alembic.ini"
    config = Config(str(alembic_ini))
    script = ScriptDirectory.from_config(config)
    return set(script.get_heads())


async def check_database_readiness(session: AsyncSession) -> None:
    expected_heads = _expected_alembic_heads()
    result = await session.execute(text("SELECT version_num FROM alembic_version"))
    current_heads = {row[0] for row in result}
    if current_heads != expected_heads:
        raise RuntimeError(
            f"Database schema is out of date: expected {sorted(expected_heads)}, got {sorted(current_heads)}"
        )


@router.get("/ready")
async def ready(db: Annotated[AsyncSession, Depends(get_db)]) -> dict[str, str]:
    try:
        await check_database_readiness(db)
    except (RuntimeError, SQLAlchemyError) as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not ready") from exc
    return {"status": "ok", "database": "ok"}
