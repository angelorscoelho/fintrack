"""
FinTrack AI — Gemini 1.5 Pro SAR Draft Node
Generates Suspicious Activity Report (SAR) draft for critical anomalies (score > 0.90).
Only invoked when anomaly_score > 0.90 — cost control per PRD Golden Rules.
"""
import json
import logging
import os
import time

import google.api_core.exceptions
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from backend.genai.graph import TransactionState
from shared.project_constants import (
    GEMINI_PRO_MODEL,
    GEMINI_PRO_MAX_TOKENS,
    GEMINI_PRO_TEMPERATURE,
)

logger = logging.getLogger(__name__)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

_pro_model = genai.GenerativeModel(
    model_name=GEMINI_PRO_MODEL,
    generation_config=genai.types.GenerationConfig(
        temperature=GEMINI_PRO_TEMPERATURE,
        max_output_tokens=GEMINI_PRO_MAX_TOKENS,
    ),
)

_SAR_PROMPT_TEMPLATE = """És um especialista sénior em conformidade financeira (AML/CFT) e administração fiscal com 20 anos de experiência a redigir Relatórios de Atividade Suspeita (SAR) para submissão regulatória.

TRANSAÇÃO CRÍTICA PARA ANÁLISE (anomaly_score={score:.2f} — CRÍTICO):

DADOS COMPLETOS:
{payload_json}

ANÁLISE PRÉVIA (Gemini Flash XAI):
{xai_summary}

INSTRUÇÃO: Produz um rascunho SAR completo em Markdown com EXATAMENTE estas 6 secções e cabeçalhos:

# RELATÓRIO DE ATIVIDADE SUSPEITA — RASCUNHO CONFIDENCIAL

## 1. IDENTIFICAÇÃO DA ENTIDADE SUSPEITA
[NIF, nome da empresa, dados de contacto disponíveis, país]

## 2. DESCRIÇÃO DA ATIVIDADE SUSPEITA
[Descreve detalhadamente a transação anómala, padrões observados e desvios da norma]

## 3. ENQUADRAMENTO REGULATÓRIO
[Referências à Lei 83/2017 (BCFT Portugal), Diretiva UE 2018/843, regulamentos aplicáveis]

## 4. ANÁLISE DE IMPACTO FINANCEIRO
[Montante envolvido: €X | Desvio da média histórica: Nx | Risco estimado: CRÍTICO]

## 5. RECOMENDAÇÃO DE AÇÃO
[Uma das seguintes: Escalar para auditoria interna | Notificar Autoridade Tributária | Congelar transações | Contactar DCIAP]

## 6. DISCLAIMER
⚠️ DOCUMENTO GERADO POR IA — REQUER REVISÃO E VALIDAÇÃO HUMANA ANTES DE QUALQUER SUBMISSÃO REGULATÓRIA. DADOS SINTÉTICOS — USO EXCLUSIVO EM CONTEXTO DE PROVA DE CONCEITO (PoC).

Escreve o SAR de forma profissional, concisa e factual. Usa os dados reais da transação."""


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
def _call_pro(prompt: str):
    """Call Gemini Pro with tenacity retry (3 attempts, exponential backoff)."""
    response = _pro_model.generate_content(prompt)
    return response


def _extract_xai_summary(ai_explanation: str | None) -> str:
    """Extract human-readable summary from XAI JSON string."""
    if not ai_explanation:
        return "Análise XAI não disponível."
    try:
        data = json.loads(ai_explanation)
        bullets = data.get("bullets", [])
        summary = data.get("summary_pt", "")
        bullets_text = "\n".join(f"  • {b.get('text', '')}" for b in bullets)
        return f"{summary}\n{bullets_text}"
    except Exception:
        return ai_explanation[:200]


def _log_genai_call(transaction_id: str, model: str, status: str,
                    duration_ms: int, prompt_tokens: int = 0,
                    response_tokens: int = 0) -> None:
    """Emit structured JSON log for a GenAI model call."""
    logger.info(json.dumps({
        "transaction_id": transaction_id,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "response_tokens": response_tokens,
        "duration_ms": duration_ms,
        "status": status,
    }))


def audit_deep(state: TransactionState) -> TransactionState:
    """
    LangGraph node: Deep Audit via Gemini 1.5 Pro.
    Only reached when anomaly_score > 0.90 (enforced by conditional edge in graph.py).
    """
    transaction_id = state["transaction_id"]
    score          = state["anomaly_score"]
    payload        = state["payload"]
    xai_summary    = _extract_xai_summary(state.get("ai_explanation"))

    t0 = time.time()
    try:
        prompt = _SAR_PROMPT_TEMPLATE.format(
            score=score,
            payload_json=json.dumps(payload, indent=2, ensure_ascii=False),
            xai_summary=xai_summary,
        )

        response = _call_pro(prompt)
        duration_ms = round((time.time() - t0) * 1000)
        sar_text = response.text.strip()

        usage = getattr(response, "usage_metadata", None)
        prompt_tokens = getattr(usage, "prompt_token_count", 0) or 0
        response_tokens = getattr(usage, "candidates_token_count", 0) or 0

        # Validate structure — must contain all 6 section headers
        required_sections = [
            "## 1. IDENTIFICAÇÃO",
            "## 2. DESCRIÇÃO",
            "## 3. ENQUADRAMENTO",
            "## 4. ANÁLISE",
            "## 5. RECOMENDAÇÃO",
            "## 6. DISCLAIMER",
        ]
        missing = [s for s in required_sections if s not in sar_text]
        if missing:
            logger.warning(f"SAR missing sections for {transaction_id}: {missing}")

        state["sar_draft"] = sar_text
        state["processing_status"] = "sar_complete"

        _log_genai_call(transaction_id, "pro", "success", duration_ms,
                        prompt_tokens, response_tokens)

        logger.warning(json.dumps({  # warning level = critical alert
            "event": "sar_generated",
            "transaction_id": transaction_id,
            "anomaly_score": score,
            "sar_length_chars": len(sar_text),
        }))

    except Exception as exc:
        _log_genai_call(transaction_id, "pro", "error",
                        round((time.time() - t0) * 1000))
        logger.error(f"Pro SAR failed for {transaction_id}: {exc}")
        # Don't overwrite ai_explanation — Flash XAI still valid
        state["sar_draft"] = None
        state["processing_status"] = "sar_error"
        state["error_message"] = str(exc)

    return state
