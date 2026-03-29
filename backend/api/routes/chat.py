"""POST /api/chat — Gemini Flash assistant for the dashboard AI sidebar."""
import asyncio
import json
import logging
from typing import Any, Dict, List, Literal, Optional

import google.generativeai as genai
from fastapi import APIRouter
from pydantic import BaseModel, Field

from api.config import settings
from shared.project_constants import GEMINI_FLASH_MODEL, GEMINI_FLASH_MAX_TOKENS, GEMINI_FLASH_TEMPERATURE

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat"])

_SYSTEM_PROMPT = (
    "You are a financial fraud analysis assistant for FinTrack AI. "
    "Be concise — under 150 words per response. Reference context data when provided."
)

_MAX_HISTORY_MESSAGES = 10

genai.configure(api_key=settings.gemini_api_key)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    context: Optional[Dict[str, Any]] = None
    history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str = ""
    error: Optional[str] = None


def _format_user_turn(text: str, ctx: Optional[Dict[str, Any]]) -> str:
    if not ctx:
        return text
    return (
        "Context (JSON):\n"
        f"{json.dumps(ctx, ensure_ascii=False)}\n\n"
        f"Question:\n{text}"
    )


def _chat_sync(message: str, history: List[ChatMessage], ctx: Optional[Dict[str, Any]]) -> str:
    model = genai.GenerativeModel(
        model_name=GEMINI_FLASH_MODEL,
        system_instruction=_SYSTEM_PROMPT,
        generation_config=genai.types.GenerationConfig(
            temperature=GEMINI_FLASH_TEMPERATURE,
            max_output_tokens=min(GEMINI_FLASH_MAX_TOKENS, 2048),
        ),
    )
    trimmed = history[-_MAX_HISTORY_MESSAGES:]
    gemini_history = []
    for m in trimmed:
        r = "user" if m.role == "user" else "model"
        gemini_history.append({"role": r, "parts": [m.content]})
    session = model.start_chat(history=gemini_history)
    user_turn = _format_user_turn(message, ctx)
    response = session.send_message(user_turn)
    text = (response.text or "").strip()
    return text


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    if not settings.gemini_api_key:
        return ChatResponse(reply="", error="Gemini API key is not configured.")

    try:
        reply = await asyncio.to_thread(_chat_sync, body.message, body.history, body.context)
        return ChatResponse(reply=reply, error=None)
    except Exception as exc:
        logger.exception("chat failed")
        return ChatResponse(reply="", error=str(exc))
