"""
Shared project constants — single source of truth.

This module loads shared/project_constants.json relative to the repository root
and exposes the values as plain Python objects. Used by:
  - backend/api  (config.py imports this)
  - backend/lambda_handler  (handler.py imports this)
  - backend/genai  (graph.py, flash_xai.py, pro_sar.py import this)
"""
import json
import os
from pathlib import Path

_CONSTANTS_FILE = Path(__file__).parent / "project_constants.json"

if not _CONSTANTS_FILE.exists():
    raise FileNotFoundError(f"Project constants file not found: {_CONSTANTS_FILE}")

with open(_CONSTANTS_FILE, "r") as f:
    _data = json.load(f)

# ── Score thresholds ──────────────────────────────────────────────────────────
XAI_THRESHOLD: float = _data["score"]["xai"]            # 0.70
SAR_THRESHOLD: float = _data["score"]["sar"]            # 0.90
FLASH_RISK_ALTO: float = _data["score"]["flash_risk_alto"]  # 0.85

# ── Risk level bands (sorted descending by min) ──────────────────────────────
RISK_LEVELS: list[dict] = sorted(_data["risk_levels"], key=lambda r: r["min"], reverse=True)


def classify_risk(score: float) -> str:
    """Return the risk level key for a given anomaly score."""
    for level in RISK_LEVELS:
        if score >= level["min"]:
            return level["key"]
    return "LOW"


# ── Gemini model configuration ───────────────────────────────────────────────
GEMINI_FLASH_MODEL: str = _data["gemini"]["models"]["flash"]
GEMINI_PRO_MODEL: str = _data["gemini"]["models"]["pro"]
GEMINI_FLASH_DAILY_LIMIT: int = _data["gemini"]["rate_limits"]["flash_daily"]
GEMINI_PRO_DAILY_LIMIT: int = _data["gemini"]["rate_limits"]["pro_daily"]
GEMINI_FLASH_TEMPERATURE: float = _data["gemini"]["generation_config"]["flash"]["temperature"]
GEMINI_FLASH_MAX_TOKENS: int = _data["gemini"]["generation_config"]["flash"]["max_output_tokens"]
GEMINI_PRO_TEMPERATURE: float = _data["gemini"]["generation_config"]["pro"]["temperature"]
GEMINI_PRO_MAX_TOKENS: int = _data["gemini"]["generation_config"]["pro"]["max_output_tokens"]

# ── Data retention ────────────────────────────────────────────────────────────
NORMAL_TTL_DAYS: int = _data["data_retention"]["normal_ttl_days"]
RATE_LIMITER_TTL_DAYS: int = _data["data_retention"]["rate_limiter_ttl_days"]

# ── API configuration ─────────────────────────────────────────────────────────
API_DEFAULT_LIMIT: int = _data["api"]["pagination"]["default_limit"]
API_MAX_LIMIT: int = _data["api"]["pagination"]["max_limit"]
HEALTH_CHECK_TIMEOUT: int = _data["api"]["timeouts"]["health_check_seconds"]
GENAI_INVOKE_TIMEOUT: int = _data["api"]["timeouts"]["genai_invoke_seconds"]

# ── Full config dict (for /api/config endpoint) ──────────────────────────────
THRESHOLDS_CONFIG: dict = _data

# ── Fraud rates (research-backed, by transaction count) ──────────────────────
FRAUD_RATE_OVERALL: float = _data["fraud_rates"]["overall"]   # 0.0006 = 0.06 %
