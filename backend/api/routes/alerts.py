"""GET /api/alerts and GET /api/alerts/{id}. Implemented in Session S07E."""
from fastapi import APIRouter

router = APIRouter(tags=["Alerts"])


@router.get("/alerts")
async def list_alerts():
    return {"items": [], "total": 0}  # placeholder


@router.get("/alerts/{transaction_id}")
async def get_alert(transaction_id: str):
    return {"transaction_id": transaction_id}  # placeholder
