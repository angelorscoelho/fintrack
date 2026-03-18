"""GET /api/stats"""
from fastapi import APIRouter
from backend.api.db.dynamo import get_stats as _get_stats
from backend.api.models import StatsResponse

router = APIRouter(tags=["Stats"])

@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    return await _get_stats()
