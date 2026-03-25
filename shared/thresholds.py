"""
Shared thresholds — single source of truth.

This module loads shared/thresholds.json relative to the repository root
and exposes the values as plain Python objects. Used by:
  - backend/api  (config.py imports this)
  - backend/lambda_handler  (handler.py imports this)
  - backend/genai  (graph.py, flash_xai.py import this)
"""
import json
import os
from pathlib import Path

_THRESHOLDS_FILE = Path(__file__).parent / "thresholds.json"

if not _THRESHOLDS_FILE.exists():
    raise FileNotFoundError(f"Thresholds file not found: {_THRESHOLDS_FILE}")

with open(_THRESHOLDS_FILE, "r") as f:
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


# ── Full config dict (for /api/config endpoint) ──────────────────────────────
THRESHOLDS_CONFIG: dict = _data
