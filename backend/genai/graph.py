"""
LangGraph workflow for GenAI anomaly explanation.
Implemented in Sessions S05E (Flash XAI) and S06E (Pro SAR).
"""
from typing import TypedDict, Optional


class TransactionState(TypedDict):
    transaction_id: str
    anomaly_score: float
    payload: dict
    ai_explanation: Optional[str]
    sar_draft: Optional[str]
    processing_status: str
    error_message: Optional[str]


def build_graph():
    """Build and compile LangGraph workflow. Implemented in S05E."""
    return None  # placeholder


def run_xai_pipeline(transaction_id: str, score: float, payload: dict) -> dict:
    """Public interface called after ML scoring. Implemented in S05E."""
    return {"processing_status": "placeholder"}
