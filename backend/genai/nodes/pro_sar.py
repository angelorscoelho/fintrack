"""
FinTrack AI — Gemini 1.5 Pro SAR Draft Node
Generates Suspicious Activity Report (SAR) draft for critical anomalies (score > 0.90).
Only invoked when anomaly_score > 0.90 — cost control per PRD Golden Rules.
"""
import logging
import os

import google.generativeai as genai

from backend.genai.graph import TransactionState

logger = logging.getLogger(__name__)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

_pro_model = genai.GenerativeModel(
    model_name="gemini-1.5-pro-latest",
    generation_config=genai.types.GenerationConfig(
        temperature=0.2,           # Slight creativity for natural language drafting
        max_output_tokens=2048,    # SAR needs space
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


def _extract_xai_summary(ai_explanation: str | None) -> str:
    """Extract human-readable summary from XAI JSON string."""
    if not ai_explanation:
        return "Análise XAI não disponível."
    try:
        import json
        data = json.loads(ai_explanation)
        bullets = data.get("bullets", [])
        summary = data.get("summary_pt", "")
        bullets_text = "\n".join(f"  • {b.get('text', '')}" for b in bullets)
        return f"{summary}\n{bullets_text}"
    except Exception:
        return ai_explanation[:200]


def audit_deep(state: TransactionState) -> TransactionState:
    """
    LangGraph node: Deep Audit via Gemini 1.5 Pro.
    Only reached when anomaly_score > 0.90 (enforced by conditional edge in graph.py).
    """
    import json

    transaction_id = state["transaction_id"]
    score          = state["anomaly_score"]
    payload        = state["payload"]
    xai_summary    = _extract_xai_summary(state.get("ai_explanation"))

    try:
        prompt = _SAR_PROMPT_TEMPLATE.format(
            score=score,
            payload_json=json.dumps(payload, indent=2, ensure_ascii=False),
            xai_summary=xai_summary,
        )

        response = _pro_model.generate_content(prompt)
        sar_text = response.text.strip()

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

        logger.warning(json.dumps({  # warning level = critical alert
            "event": "sar_generated",
            "transaction_id": transaction_id,
            "anomaly_score": score,
            "sar_length_chars": len(sar_text),
        }))

    except Exception as exc:
        logger.error(f"Pro SAR failed for {transaction_id}: {exc}")
        # Don't overwrite ai_explanation — Flash XAI still valid
        state["sar_draft"] = None
        state["processing_status"] = "sar_error"
        state["error_message"] = str(exc)

    return state
