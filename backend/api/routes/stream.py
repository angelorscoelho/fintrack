"""
GET /api/alerts/stream — Server-Sent Events
Hard cap: 3 concurrent connections (asyncio.Semaphore).
Poll interval: 5 seconds (balance between UX responsiveness and DynamoDB cost).
Decimal: serialized as float (not str) to avoid React Number() workarounds.
"""
import asyncio
import json
import logging
from decimal import Decimal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.api.db.dynamo import get_latest_alerts, _decimal_safe

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Streaming"])

# Hard cap: max 3 simultaneous SSE connections
# Prevents runaway DynamoDB scan costs if multiple browser tabs ignore dedup
_SSE_SEMAPHORE = asyncio.Semaphore(3)
POLL_INTERVAL  = 5  # seconds


@router.get("/alerts/stream")
async def stream_alerts():
    """
    SSE endpoint for real-time dashboard updates.
    Frontend uses BroadcastChannel leader election — typically only 1 connection active.
    Backend cap of 3 handles edge cases (page refresh, multiple users in PoC).
    """
    # Try to acquire slot — non-blocking check
    acquired = _SSE_SEMAPHORE._value > 0  # peek without blocking
    if not acquired:
        raise HTTPException(
            status_code=503,
            detail="Maximum SSE connections reached (3). Close another tab or wait.",
        )

    async def event_generator():
        async with _SSE_SEMAPHORE:
            seen_ids: set[str] = set()
            logger.info(f"SSE connection opened (slots used: {3 - _SSE_SEMAPHORE._value})")
            try:
                while True:
                    try:
                        alerts = await get_latest_alerts(limit=20)
                        new_alerts = [
                            a for a in alerts
                            if a.get("transaction_id") not in seen_ids
                        ]
                        for alert in new_alerts:
                            tid = alert.get("transaction_id", "")
                            seen_ids.add(tid)
                            # Use float for Decimal — avoids "0.87" string bug in React
                            yield f"data: {json.dumps(alert, default=_decimal_safe)}\n\n"

                        yield ": heartbeat\n\n"

                    except Exception as exc:
                        logger.error(f"SSE poll error: {exc}")
                        yield f"data: {json.dumps({'error': 'poll_failed'})}\n\n"

                    await asyncio.sleep(POLL_INTERVAL)
            except asyncio.CancelledError:
                logger.info("SSE connection closed by client")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
        },
    )
