"""FinTrack AI — FastAPI Application."""
import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from api.db.dynamo import init_dynamo_client
from api.routes import alerts, health, stats, resolve, stream, config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_dynamo_client()
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
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


app.include_router(stream.router, prefix="/api")
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
