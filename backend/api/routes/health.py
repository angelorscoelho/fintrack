"""GET /api/health/gemini — Gemini integration health check."""
import asyncio
import logging
import time
from typing import Optional

import google.generativeai as genai
from fastapi import APIRouter

from api.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Health"])

_HEALTH_PROMPT = "Responde apenas com OK"
_TIMEOUT_SECONDS = 5

# Configure once at module load (same pattern as genai/nodes/*.py)
genai.configure(api_key=settings.gemini_api_key)


def _ping_model(model_name: str) -> tuple[str, float]:
    """
    Send a minimal prompt to a Gemini model and return (status, latency_ms).
    Raises on any failure so the caller can catch and report.
    """
    model = genai.GenerativeModel(model_name=model_name)
    start = time.perf_counter()
    model.generate_content(_HEALTH_PROMPT)
    latency_ms = round((time.perf_counter() - start) * 1000)
    return "ok", latency_ms


async def _check_model(model_name: str) -> tuple[str, float, Optional[str]]:
    """
    Run a health-check ping for *model_name* with a 5 s timeout.
    Returns (status, latency_ms, error_message | None).
    """
    try:
        status, latency = await asyncio.wait_for(
            asyncio.to_thread(_ping_model, model_name),
            timeout=_TIMEOUT_SECONDS,
        )
        return status, latency, None
    except asyncio.TimeoutError:
        return "error", 0, f"{model_name}: timeout after {_TIMEOUT_SECONDS}s"
    except Exception as exc:
        return "error", 0, f"{model_name}: {exc}"


@router.get("/health/gemini")
async def gemini_health():
    """
    Health-check for Gemini Flash and Pro models.
    Each model receives a trivial prompt with a 5 s timeout.
    """
    flash_status, flash_latency, flash_err = await _check_model(
        "gemini-1.5-flash-latest",
    )
    pro_status, pro_latency, pro_err = await _check_model(
        "gemini-1.5-pro-latest",
    )

    errors = [e for e in (flash_err, pro_err) if e]
    error_message = "; ".join(errors) if errors else None

    return {
        "gemini_flash": flash_status,
        "gemini_pro": pro_status,
        "latency_flash_ms": flash_latency,
        "latency_pro_ms": pro_latency,
        "error_message": error_message,
    }


async def get_gemini_status() -> dict:
    """
    Return a summary dict suitable for inclusion in the main /health response.
    Re-uses the same logic as the dedicated endpoint.
    """
    flash_status, _, flash_err = await _check_model("gemini-1.5-flash-latest")
    pro_status, _, pro_err = await _check_model("gemini-1.5-pro-latest")

    errors = [e for e in (flash_err, pro_err) if e]
    overall = "ok" if flash_status == "ok" and pro_status == "ok" else "error"

    return {
        "status": overall,
        "gemini_flash": flash_status,
        "gemini_pro": pro_status,
        "error_message": "; ".join(errors) if errors else None,
    }
