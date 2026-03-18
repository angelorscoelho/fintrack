"""
FinTrack AI — LangGraph Workflow
Phase 1 (S05E): Single node — Gemini Flash XAI for scores 0.70–0.90
Phase 2 (S06E): Conditional edge added — Gemini Pro SAR for scores > 0.90
"""
import logging
import os
from typing import Optional, TypedDict

import boto3
from langgraph.graph import END, StateGraph

logger = logging.getLogger(__name__)

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "transactions")
_table = dynamodb.Table(TABLE_NAME)


# ── State Schema ──────────────────────────────────────────────────────────────
class TransactionState(TypedDict):
    transaction_id: str
    anomaly_score: float
    payload: dict
    ai_explanation: Optional[str]   # JSON string stored in DynamoDB
    sar_draft: Optional[str]         # Markdown string (S06E)
    processing_status: str           # pending | xai_complete | sar_complete | error
    error_message: Optional[str]


# ── Graph Assembly ────────────────────────────────────────────────────────────
def build_graph() -> StateGraph:
    """
    Build compiled LangGraph workflow.
    S05E: analyse_basic → END
    S06E will add: analyse_basic → [conditional] → audit_deep → END
    """
    from backend.genai.nodes.flash_xai import analyse_basic
    # from backend.genai.nodes.pro_sar import audit_deep  # uncomment in S06E

    graph = StateGraph(TransactionState)
    graph.add_node("analyse_basic", analyse_basic)
    graph.set_entry_point("analyse_basic")
    graph.add_edge("analyse_basic", END)  # S06E replaces this with conditional edge

    return graph.compile()


# Singleton — compiled once at service startup
_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


def run_xai_pipeline(transaction_id: str, score: float, payload: dict) -> dict:
    """
    Public interface. Runs the LangGraph pipeline and persists result to DynamoDB.
    Returns final state dict.
    """
    initial_state: TransactionState = {
        "transaction_id": transaction_id,
        "anomaly_score": score,
        "payload": payload,
        "ai_explanation": None,
        "sar_draft": None,
        "processing_status": "pending",
        "error_message": None,
    }

    result = get_graph().invoke(initial_state)

    # Persist to DynamoDB
    update_expr = "SET processing_status = :ps"
    expr_values = {":ps": result["processing_status"]}

    if result.get("ai_explanation"):
        update_expr += ", ai_explanation = :xai"
        expr_values[":xai"] = result["ai_explanation"]

    if result.get("sar_draft"):  # populated in S06E
        update_expr += ", sar_draft = :sar"
        expr_values[":sar"] = result["sar_draft"]

    try:
        _table.update_item(
            Key={"transaction_id": transaction_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
        )
        logger.info(f"DynamoDB updated for {transaction_id}: {result['processing_status']}")
    except Exception as exc:
        logger.error(f"DynamoDB update failed for {transaction_id}: {exc}")

    return result
