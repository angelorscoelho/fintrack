"""Config endpoint — exposes shared project constants to any runtime consumer."""
from fastapi import APIRouter

from shared.project_constants import THRESHOLDS_CONFIG

router = APIRouter()


@router.get("/api/config")
async def get_config():
    """
    Return the shared project constants configuration.

    This endpoint allows any client (frontend SPA, external tool, CI script)
    to fetch the authoritative project constants at runtime. The frontend
    also receives these at build time via Vite define, but this endpoint
    serves as a runtime fallback and a contract surface.
    """
    return THRESHOLDS_CONFIG
