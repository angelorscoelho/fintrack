"""GET /api/alerts, GET /api/alerts/{transaction_id}, POST analyze"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from api.db.dynamo import get_alert_by_id, get_alerts_by_status, update_ai_explanation
from api.models import AlertListResponse, AlertResponse
from api.xai_on_demand import generate_xai_for_alert
from api.config import settings
from shared.project_constants import AI_ANALYSIS_MIN_SCORE, API_DEFAULT_LIMIT, API_MAX_LIMIT

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Alerts"])


@router.get("/alerts", response_model=AlertListResponse)
async def list_alerts(
    status: Optional[str] = Query(None, description="Filter by status: NORMAL|PENDING_REVIEW|RESOLVED|FALSE_POSITIVE"),
    limit: int = Query(API_DEFAULT_LIMIT, ge=1, le=API_MAX_LIMIT),
    offset: int = Query(0, ge=0),
):
    items, total = await get_alerts_by_status(status=status, limit=limit, offset=offset)
    page = offset // limit + 1
    return AlertListResponse(items=items, total=total, page=page, page_size=limit)


@router.get("/alerts/{transaction_id}", response_model=AlertResponse)
async def get_alert(transaction_id: str):
    item = await get_alert_by_id(transaction_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Alert {transaction_id} not found")
    return item


@router.post("/alerts/{transaction_id}/analyze", response_model=AlertResponse)
async def analyze_alert(transaction_id: str):
    """Generate AI explanation on demand (Gemini Flash) and persist to DynamoDB."""
    item = await get_alert_by_id(transaction_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Alert {transaction_id} not found")

    score = float(item.get("anomaly_score") or 0)
    if score < AI_ANALYSIS_MIN_SCORE:
        raise HTTPException(
            status_code=400,
            detail=f"anomaly_score must be >= {AI_ANALYSIS_MIN_SCORE} for on-demand analysis",
        )

    if item.get("ai_explanation"):
        return AlertResponse.model_validate(item)

    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key is not configured.")

    try:
        xai_data = generate_xai_for_alert(item)
        await update_ai_explanation(transaction_id, json.dumps(xai_data, ensure_ascii=False))
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("analyze_alert failed for %s", transaction_id)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    updated = await get_alert_by_id(transaction_id)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to reload alert after analysis")
    return AlertResponse.model_validate(updated)
