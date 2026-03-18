"""PUT /api/alerts/{transaction_id}/resolve — human feedback loop."""
import logging
from datetime import datetime, timezone
from enum import Enum

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.api.db.dynamo import get_alert_by_id, resolve_alert as _resolve

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Resolution"])


class ResolutionType(str, Enum):
    CONFIRMED_FRAUD = "CONFIRMED_FRAUD"
    FALSE_POSITIVE  = "FALSE_POSITIVE"
    ESCALATED       = "ESCALATED"


class ResolveRequest(BaseModel):
    resolution_type: ResolutionType
    analyst_notes: str = ""


@router.put("/alerts/{transaction_id}/resolve")
async def resolve_alert(transaction_id: str, body: ResolveRequest):
    existing = await get_alert_by_id(transaction_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Alert not found")
    if existing.get("status") in ("RESOLVED", "FALSE_POSITIVE"):
        raise HTTPException(status_code=409, detail="Alert already resolved")

    new_status = (
        "FALSE_POSITIVE"
        if body.resolution_type == ResolutionType.FALSE_POSITIVE
        else "RESOLVED"
    )
    await _resolve(
        transaction_id=transaction_id,
        new_status=new_status,
        resolution_type=body.resolution_type.value,
        resolved_at=datetime.now(timezone.utc).isoformat(),
        analyst_notes=body.analyst_notes,
    )
    logger.info(f"Resolved {transaction_id} → {body.resolution_type.value}")
    return {
        "transaction_id": transaction_id,
        "status": new_status,
        "resolution_type": body.resolution_type.value,
    }
