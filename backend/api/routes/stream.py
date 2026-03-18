"""GET /api/alerts/stream — Server-Sent Events. Implemented in Session S08E."""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(tags=["Streaming"])


@router.get("/alerts/stream")
async def stream_alerts():
    async def generator():
        yield ": heartbeat\n\n"  # placeholder
    return StreamingResponse(generator(), media_type="text/event-stream")
