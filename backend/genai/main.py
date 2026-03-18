"""
FinTrack AI — GenAI Microservice
Standalone FastAPI service (port 8001) called by Lambda handler.
Receives transaction data, runs LangGraph pipeline, updates DynamoDB.
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from backend.genai.graph import run_xai_pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnalyseRequest(BaseModel):
    transaction_id: str
    anomaly_score: float
    payload: dict


@asynccontextmanager
async def lifespan(app: FastAPI):
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
        result = run_xai_pipeline(
            transaction_id=request.transaction_id,
            score=request.anomaly_score,
            payload=request.payload,
        )
        return {
            "transaction_id": request.transaction_id,
            "processing_status": result["processing_status"],
        }
    except Exception as exc:
        logger.error(f"Pipeline failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "fintrack-genai"}
