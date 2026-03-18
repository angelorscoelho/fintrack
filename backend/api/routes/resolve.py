"""PUT /api/alerts/{id}/resolve. Implemented in Session S08E."""
from fastapi import APIRouter

router = APIRouter(tags=["Resolution"])


@router.put("/alerts/{transaction_id}/resolve")
async def resolve_alert(transaction_id: str):
    return {"transaction_id": transaction_id, "status": "resolved"}  # placeholder
