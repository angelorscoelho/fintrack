"""
FinTrack AI — Gemini 1.5 Flash XAI Node
Generates 3-bullet anomaly explanation in Portuguese for scores >= XAI_THRESHOLD.
"""
import json
import logging
import os

import google.api_core.exceptions
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from backend.genai.graph import TransactionState
from shared.thresholds import FLASH_RISK_ALTO

logger = logging.getLogger(__name__)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

_SYSTEM_PROMPT = """És um especialista sénior em análise forense financeira e auditoria fiscal.
Analisa transações financeiras sinalizadas por um modelo de Machine Learning (Isolation Forest).
A tua tarefa é explicar, em linguagem clara para auditores não técnicos, POR QUE esta transação é matematicamente anómala.
Respondes SEMPRE em JSON válido e NUNCA incluis texto fora do JSON."""

_flash_model = genai.GenerativeModel(
    model_name="gemini-1.5-flash-latest",
    system_instruction=_SYSTEM_PROMPT,
    generation_config=genai.types.GenerationConfig(
        temperature=0.1,          # Low creativity — factual, consistent output
        max_output_tokens=512,
        response_mime_type="application/json",  # Enforce JSON response
    ),
)

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
    {{"id": 3, "icon": "🔍", "text": "contexto de risco adicional relevante"}}
  ],
  "risk_level": "{risk_level}",
  "summary_pt": "frase única de resumo executivo em português"
}}"""


def _build_prompt(payload: dict, score: float) -> str:
    amount   = float(payload.get("amount", 0))
    prev_avg = float(payload.get("previous_avg_amount", 1)) or 1.0
    ratio    = amount / prev_avg
    risk     = "ALTO" if score > FLASH_RISK_ALTO else "MÉDIO"
    hour     = int(payload.get("hour_of_day", 0))
    days     = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    day_name = days[int(payload.get("day_of_week", 0)) % 7]

    return _USER_PROMPT_TEMPLATE.format(
        score=score, risk_level=risk,
        amount=amount, prev_avg=prev_avg, ratio=ratio,
        category=payload.get("category", "unknown"),
        hour=hour, day=day_name,
        country=payload.get("merchant_country", "?"),
        velocity=int(payload.get("transactions_last_10min", 0)),
        ip=payload.get("ip_address", "unknown"),
    )


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((
        google.api_core.exceptions.ResourceExhausted,
        google.api_core.exceptions.ServiceUnavailable,
        google.api_core.exceptions.InternalServerError,
        google.api_core.exceptions.DeadlineExceeded,
    )),
    reraise=True,
)
def _call_flash(prompt: str) -> str:
    """Call Gemini Flash with tenacity retry (3 attempts, exponential backoff)."""
    response = _flash_model.generate_content(prompt)
    return response.text.strip()


def analyse_basic(state: TransactionState) -> TransactionState:
    """
    LangGraph node: Basic XAI Analysis via Gemini 1.5 Flash.
    Triggered for all transactions entering the graph (score >= 0.70).
    """
    transaction_id = state["transaction_id"]
    score          = state["anomaly_score"]
    payload        = state["payload"]

    try:
        prompt = _build_prompt(payload, score)

        raw_text = _call_flash(prompt)

        # Validate JSON structure
        xai_data = json.loads(raw_text)
        if "bullets" not in xai_data:
            raise ValueError("Missing 'bullets' key in Gemini response")
        if len(xai_data["bullets"]) != 3:
            raise ValueError(f"Expected 3 bullets, got {len(xai_data['bullets'])}")
        if "summary_pt" not in xai_data:
            raise ValueError("Missing 'summary_pt' key in Gemini response")

        state["ai_explanation"] = json.dumps(xai_data, ensure_ascii=False)
        state["processing_status"] = "xai_complete"

        logger.info(f"XAI generated for {transaction_id} (score={score:.2f})")

    except json.JSONDecodeError as exc:
        logger.error(f"Gemini returned invalid JSON for {transaction_id}: {exc}")
        state["ai_explanation"] = None
        state["processing_status"] = "error"
        state["error_message"] = f"JSON parse error: {exc}"

    except Exception as exc:
        logger.error(f"Flash XAI failed for {transaction_id}: {exc}")
        state["ai_explanation"] = None
        state["processing_status"] = "error"
        state["error_message"] = str(exc)

    return state
