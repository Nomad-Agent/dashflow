"""Pytest hooks — run before app imports so DATABASE_URL_TEST can back DATABASE_URL."""

import os

if os.getenv("DATABASE_URL_TEST") and not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["DATABASE_URL_TEST"]

from app.core.config import get_settings

get_settings.cache_clear()
