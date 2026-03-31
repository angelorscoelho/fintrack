"""
FinTrack AI — GenAI Microservice
Standalone FastAPI service (port 8001) called by Lambda handler.
Receives transaction data, runs LangGraph pipeline, updates DynamoDB.
"""
import logging
import os
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from backend.genai.graph import run_xai_pipeline

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


class AnalyseRequest(BaseModel):
    transaction_id: str
    anomaly_score: float
    payload: dict


@asynccontextmanager
async def lifespan(app: FastAPI):
    _agent_debug_log(
        "H3",
        "backend/genai/main.py:lifespan_start",
        "GenAI service lifespan starting",
        {
            "aws_region": os.environ.get("AWS_REGION"),
            "aws_default_region": os.environ.get("AWS_DEFAULT_REGION"),
            "dynamodb_table": os.environ.get("DYNAMODB_TABLE"),
            "has_gemini_api_key": bool(os.environ.get("GEMINI_API_KEY")),
        },
    )
    logger.info("GenAI microservice starting — loading LangGraph...")
    from backend.genai.graph import get_graph
    get_graph()  # Pre-compile graph at startup
    logger.info("LangGraph compiled and ready.")
    yield


app = FastAPI(
    title="FinTrack GenAI Service",
    version="1.0.0",
    description="LangGraph + Gemini pipeline for XAI and SAR generation",
    lifespan=lifespan,
)


@app.post("/analyse")
async def analyse(request: AnalyseRequest):
    """
    Analyse a flagged transaction.
    Called by Lambda handler (fire-and-forget).
    Updates DynamoDB directly — does not return GenAI content to caller.
    """
    try:
        _agent_debug_log(
            "H4",
            "backend/genai/main.py:analyse_in",
            "Analyse endpoint called",
            {
                "transaction_id": request.transaction_id,
                "anomaly_score": request.anomaly_score,
            },
        )
        result = run_xai_pipeline(
            transaction_id=request.transaction_id,
            score=request.anomaly_score,
            payload=request.payload,
        )
        _agent_debug_log(
            "H4",
            "backend/genai/main.py:analyse_out",
            "Analyse endpoint completed",
            {
                "transaction_id": request.transaction_id,
                "processing_status": result.get("processing_status"),
            },
        )
        return {
            "transaction_id": request.transaction_id,
            "processing_status": result["processing_status"],
        }
    except Exception as exc:
        _agent_debug_log(
            "H4",
            "backend/genai/main.py:analyse_error",
            "Analyse endpoint failed",
            {"error": str(exc), "error_type": type(exc).__name__},
        )
        logger.error(f"Pipeline failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "fintrack-genai"}
