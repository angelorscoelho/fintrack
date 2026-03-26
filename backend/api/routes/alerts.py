"""GET /api/alerts and GET /api/alerts/{transaction_id}"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from api.db.dynamo import get_alert_by_id, get_alerts_by_status
from api.models import AlertListResponse, AlertResponse
from shared.project_constants import API_DEFAULT_LIMIT, API_MAX_LIMIT

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
