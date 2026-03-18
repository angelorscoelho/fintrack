"""FinTrack AI — GenAI Microservice (FastAPI port 8001). Implemented in Session S05E."""
from fastapi import FastAPI

app = FastAPI(title="FinTrack GenAI Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "fintrack-genai"}
