"""
FinTrack AI — ML Scorer (Lambda Inference)
Loads IsolationForest from Lambda Layer and scores individual transactions.

CRITICAL: Feature engineering here must be 100% identical to data/train_model.py.
Any difference = score drift = incorrect anomaly detection.
"""
import logging
import math
import pickle
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# Lambda Layer path (deployed) or local path (dev)
_MODEL_PATHS = [
    Path("/opt/python/model.pkl"),          # Lambda Layer (production)
    Path("backend/lambda_layer/model.pkl"), # Local development
    Path("../lambda_layer/model.pkl"),      # Relative from lambda_handler/
]

_artifact_cache: dict[str, Any] = {}


def _load_artifact() -> dict:
    """Load model artifact with caching (warm Lambda reuse)."""
    if _artifact_cache:
        return _artifact_cache

    for path in _MODEL_PATHS:
        if path.exists():
            with open(path, "rb") as f:
                artifact = pickle.load(f)
            _artifact_cache.update(artifact)
            logger.info(f"Model loaded from {path}")
            return _artifact_cache

    raise FileNotFoundError(
        f"model.pkl not found. Searched: {[str(p) for p in _MODEL_PATHS]}. "
        "Run: python data/train_model.py"
    )


def _build_feature_vector(payload: dict, artifact: dict) -> np.ndarray:
    """
    Build 9-element feature vector from transaction payload.
    MUST be 100% identical in logic to data/train_model.py::build_feature_matrix().
    """
    le = artifact["label_encoder"]
    categories = artifact["categories"]

    amount         = float(payload.get("amount", 0))
    prev_avg       = float(payload.get("previous_avg_amount", 1)) or 1.0
    velocity       = float(payload.get("transactions_last_10min", 0))
    hour           = float(payload.get("hour_of_day", 12))
    day            = float(payload.get("day_of_week", 1))
    country        = str(payload.get("merchant_country", "PT"))
    raw_category   = str(payload.get("category", categories[0]))
    category       = raw_category if raw_category in categories else categories[0]

    category_enc = le.transform([category])[0]

    return np.array([
        amount / max(prev_avg, 1.0),          # amount_ratio
        velocity / 10.0,                       # velocity_score
        math.sin(2 * math.pi * hour / 24),    # hour_sin
        math.cos(2 * math.pi * hour / 24),    # hour_cos
        day / 6.0,                             # day_norm
        math.log1p(amount),                    # amount_log
        1.0 if hour <= 5 else 0.0,            # is_off_hours
        0.0 if country == "PT" else 1.0,       # is_foreign
        float(category_enc),                   # category_enc
    ], dtype=np.float64)


def score_transaction(payload: dict) -> float:
    """
    Score a single transaction.
    
    Returns:
        float in [0.0, 1.0] where:
        - < 0.70 → NORMAL
        - 0.70–0.90 → PENDING_REVIEW (Gemini Flash XAI)
        - > 0.90 → PENDING_REVIEW (Gemini Flash + Pro SAR)
    """
    artifact = _load_artifact()
    model    = artifact["model"]
    norm_min = artifact["norm_min"]
    norm_max = artifact["norm_max"]

    features = _build_feature_vector(payload, artifact)
    raw_score = model.score_samples([features])[0]

    # Mirror normalization from train_model.py::normalize_scores()
    inverted   = -raw_score
    clipped    = max(norm_min, min(norm_max, inverted))
    normalized = (clipped - norm_min) / (norm_max - norm_min + 1e-9)
    score      = max(0.0, min(1.0, normalized))

    logger.debug(f"raw={raw_score:.4f} inverted={inverted:.4f} normalized={score:.4f}")
    return round(score, 4)
