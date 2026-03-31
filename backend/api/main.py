"""FinTrack AI — FastAPI Application."""
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from api.db.dynamo import init_dynamo_client
from api.routes import alerts, chat, health, stats, resolve, stream, config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _agent_debug_log(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    # region agent log
    try:
        payload = {
            "sessionId": "64cd1b",
            "runId": "pre-fix",
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        }
        with open("debug-64cd1b.log", "a", encoding="utf-8") as fh:
            fh.write(json.dumps(payload, separators=(",", ":")) + "\n")
    except Exception:
        pass
    # endregion


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_dynamo_client()
    _agent_debug_log(
        "H2",
        "backend/api/main.py:lifespan",
        "API startup completed",
        {
            "aws_region": os.environ.get("AWS_REGION"),
            "aws_default_region": os.environ.get("AWS_DEFAULT_REGION"),
            "dynamodb_table": os.environ.get("DYNAMODB_TABLE"),
            "allow_origins": ["http://localhost:3000", "http://localhost:5173"],
        },
    )
    logger.info("FastAPI ready.")
    yield


app = FastAPI(title="FinTrack AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    _agent_debug_log(
        "H2",
        "backend/api/main.py:request_in",
        "Incoming request",
        {
            "request_id": request_id,
            "method": request.method,
            "path": str(request.url.path),
            "origin": request.headers.get("origin"),
        },
    )
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    _agent_debug_log(
        "H2",
        "backend/api/main.py:request_out",
        "Outgoing response",
        {
            "request_id": request_id,
            "method": request.method,
            "path": str(request.url.path),
            "status_code": response.status_code,
            "allow_origin": response.headers.get("access-control-allow-origin"),
        },
    )
    return response


app.include_router(stream.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(resolve.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(config.router)


@app.get("/health")
async def health_check():
    base = {"status": "ok", "service": "fintrack-api"}
    try:
        gemini = await health.get_gemini_status()
        base["gemini"] = gemini
        if gemini["status"] != "ok":
            base["status"] = "degraded"
    except Exception:
        base["gemini"] = {"status": "error", "error_message": "health check failed"}
        base["status"] = "degraded"
    return base
