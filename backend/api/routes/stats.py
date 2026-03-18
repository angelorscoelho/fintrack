"""GET /api/stats. Implemented in Session S07E."""
from fastapi import APIRouter

router = APIRouter(tags=["Stats"])


@router.get("/stats")
async def get_stats():
    return {"total": 0, "pending": 0, "critical": 0, "fp_rate": 0.0}  # placeholder
