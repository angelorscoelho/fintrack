"""On-demand Gemini Flash XAI for POST /api/alerts/{id}/analyze (dashboard)."""
import json
import logging
from typing import Any, Dict

import google.generativeai as genai

from api.config import settings
from shared.project_constants import (
    FLASH_RISK_ALTO,
    GEMINI_FLASH_MAX_TOKENS,
    GEMINI_FLASH_MODEL,
    GEMINI_FLASH_TEMPERATURE,
)

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """És um especialista sénior em análise forense financeira e auditoria fiscal.
Analisa transações financeiras sinalizadas por um modelo de Machine Learning (Isolation Forest).
A tua tarefa é explicar, em linguagem clara para auditores não técnicos, POR QUE esta transação é matematicamente anómala.
Respondes SEMPRE em JSON válido e NUNCA incluis texto fora do JSON."""

_USER_PROMPT_TEMPLATE = """Analisa a seguinte transação sinalizada com anomaly_score={score:.2f} ({risk_level} RISCO):

DADOS DA TRANSAÇÃO:
- Valor: €{amount:.2f} (Média histórica da entidade: €{prev_avg:.2f})
- Ratio de desvio: {ratio:.1f}x acima da média
- Categoria: {category}
- Hora: {hour}h | Dia da semana: {day}
- País comerciante: {country}
- Transações nos últimos 10 min: {velocity}
- IP: {ip}

INSTRUÇÃO: Retorna APENAS este JSON (sem markdown, sem texto extra):
{{
  "bullets": [
    {{"id": 1, "icon": "⚠️", "text": "primeiro indicador de anomalia em 1-2 frases curtas"}},
    {{"id": 2, "icon": "📊", "text": "desvio estatístico específico com números concretos"}},
    {{"id": 3, "icon": "🔍", "text": "recomendação ou contexto de revisão para o analista"}}
  ],
  "risk_level": "{risk_level}",
  "summary_pt": "frase única de resumo executivo em português"
}}"""


def _alert_to_payload(alert: Dict[str, Any]) -> dict:
    return {
        "amount": float(alert.get("amount") or 0),
        "previous_avg_amount": float(alert.get("previous_avg_amount") or 1) or 1.0,
        "category": alert.get("category") or "unknown",
        "hour_of_day": int(alert.get("hour_of_day") or 0),
        "day_of_week": int(alert.get("day_of_week") or 0),
        "merchant_country": alert.get("merchant_country") or "?",
        "transactions_last_10min": int(alert.get("transactions_last_10min") or 0),
        "ip_address": alert.get("ip_address") or "unknown",
    }


def _build_prompt(payload: dict, score: float) -> str:
    amount = float(payload.get("amount", 0))
    prev_avg = float(payload.get("previous_avg_amount", 1)) or 1.0
    ratio = amount / prev_avg
    risk = "ALTO" if score > FLASH_RISK_ALTO else "MÉDIO"
    hour = int(payload.get("hour_of_day", 0))
    days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    day_name = days[int(payload.get("day_of_week", 0)) % 7]

    return _USER_PROMPT_TEMPLATE.format(
        score=score,
        risk_level=risk,
        amount=amount,
        prev_avg=prev_avg,
        ratio=ratio,
        category=payload.get("category", "unknown"),
        hour=hour,
        day=day_name,
        country=payload.get("merchant_country", "?"),
        velocity=int(payload.get("transactions_last_10min", 0)),
        ip=payload.get("ip_address", "unknown"),
    )


def _flash_generate_json(prompt: str) -> str:
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name=GEMINI_FLASH_MODEL,
        system_instruction=_SYSTEM_PROMPT,
        generation_config=genai.types.GenerationConfig(
            temperature=GEMINI_FLASH_TEMPERATURE,
            max_output_tokens=min(GEMINI_FLASH_MAX_TOKENS, 2048),
            response_mime_type="application/json",
        ),
    )
    response = model.generate_content(prompt)
    return (response.text or "").strip()


def generate_xai_for_alert(alert: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run Gemini Flash XAI and return a dict suitable for DynamoDB (same shape as Lambda flash_xai).
    Raises ValueError on validation failure; propagates API errors.
    """
    score = float(alert.get("anomaly_score") or 0)
    payload = _alert_to_payload(alert)
    prompt = _build_prompt(payload, score)
    raw_text = _flash_generate_json(prompt)
    xai_data = json.loads(raw_text)
    if "bullets" not in xai_data:
        raise ValueError("Missing 'bullets' key in Gemini response")
    if len(xai_data["bullets"]) != 3:
        raise ValueError(f"Expected 3 bullets, got {len(xai_data['bullets'])}")
    if "summary_pt" not in xai_data:
        raise ValueError("Missing 'summary_pt' key in Gemini response")
    return xai_data

