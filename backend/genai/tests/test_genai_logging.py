"""Tests for structured JSON logging in GenAI pipeline (US-063)."""
import json
import logging
import os
import time
from unittest.mock import MagicMock, patch

import pytest

# Set required env vars before any boto3 import
os.environ.setdefault("AWS_DEFAULT_REGION", "eu-west-1")
os.environ.setdefault("DYNAMODB_TABLE", "transactions")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_state(tid="txn-001", score=0.85):
    return {
        "transaction_id": tid,
        "anomaly_score": score,
        "payload": {
            "transaction_id": tid,
            "amount": 5000.0,
            "previous_avg_amount": 500.0,
            "category": "electronics",
            "hour_of_day": 3,
            "day_of_week": 1,
            "merchant_country": "PT",
            "transactions_last_10min": 5,
            "ip_address": "1.2.3.4",
        },
        "ai_explanation": None,
        "sar_draft": None,
        "processing_status": "pending",
        "error_message": None,
    }


def _mock_gemini_response(text="{}"):
    """Build a fake Gemini response with usage_metadata."""
    resp = MagicMock()
    resp.text = text
    usage = MagicMock()
    usage.prompt_token_count = 120
    usage.candidates_token_count = 80
    resp.usage_metadata = usage
    return resp


# ---------------------------------------------------------------------------
# flash_xai — analyse_basic
# ---------------------------------------------------------------------------

class TestFlashXaiLogging:
    """Structured log emitted by analyse_basic (Gemini Flash)."""

    @patch("backend.genai.nodes.flash_xai._flash_model")
    def test_success_log_fields(self, mock_model, caplog):
        from backend.genai.nodes.flash_xai import analyse_basic

        valid_json = json.dumps({
            "bullets": [
                {"id": 1, "icon": "⚠️", "text": "a"},
                {"id": 2, "icon": "📊", "text": "b"},
                {"id": 3, "icon": "🔍", "text": "c"},
            ],
            "risk_level": "ALTO",
            "summary_pt": "resumo",
        })
        mock_model.generate_content.return_value = _mock_gemini_response(valid_json)

        state = _make_state()
        with caplog.at_level(logging.INFO, logger="backend.genai.nodes.flash_xai"):
            analyse_basic(state)

        # Find the structured log line
        log_entries = [
            json.loads(r.message)
            for r in caplog.records
            if r.name == "backend.genai.nodes.flash_xai" and r.message.startswith("{")
        ]
        assert len(log_entries) >= 1
        entry = log_entries[0]

        assert entry["transaction_id"] == "txn-001"
        assert entry["model"] == "flash"
        assert entry["status"] == "success"
        assert "prompt_tokens" in entry
        assert "response_tokens" in entry
        assert "duration_ms" in entry
        assert isinstance(entry["duration_ms"], int)
        assert entry["prompt_tokens"] == 120
        assert entry["response_tokens"] == 80

    @patch("backend.genai.nodes.flash_xai._flash_model")
    def test_error_log_fields(self, mock_model, caplog):
        from backend.genai.nodes.flash_xai import analyse_basic

        mock_model.generate_content.side_effect = RuntimeError("API down")

        state = _make_state()
        with caplog.at_level(logging.INFO, logger="backend.genai.nodes.flash_xai"):
            result = analyse_basic(state)

        log_entries = [
            json.loads(r.message)
            for r in caplog.records
            if r.name == "backend.genai.nodes.flash_xai" and r.message.startswith("{")
        ]
        assert len(log_entries) >= 1
        entry = log_entries[0]

        assert entry["transaction_id"] == "txn-001"
        assert entry["model"] == "flash"
        assert entry["status"] == "error"
        assert entry["prompt_tokens"] == 0
        assert entry["response_tokens"] == 0
        assert result["processing_status"] == "error"


# ---------------------------------------------------------------------------
# pro_sar — audit_deep
# ---------------------------------------------------------------------------

class TestProSarLogging:
    """Structured log emitted by audit_deep (Gemini Pro)."""

    @patch("backend.genai.nodes.pro_sar._pro_model")
    def test_success_log_fields(self, mock_model, caplog):
        from backend.genai.nodes.pro_sar import audit_deep

        sar_md = (
            "# RELATÓRIO\n"
            "## 1. IDENTIFICAÇÃO DA ENTIDADE SUSPEITA\ntext\n"
            "## 2. DESCRIÇÃO DA ATIVIDADE SUSPEITA\ntext\n"
            "## 3. ENQUADRAMENTO REGULATÓRIO\ntext\n"
            "## 4. ANÁLISE DE IMPACTO FINANCEIRO\ntext\n"
            "## 5. RECOMENDAÇÃO DE AÇÃO\ntext\n"
            "## 6. DISCLAIMER\ntext\n"
        )
        mock_model.generate_content.return_value = _mock_gemini_response(sar_md)

        state = _make_state(score=0.95)
        state["ai_explanation"] = json.dumps({
            "bullets": [{"id": 1, "icon": "⚠️", "text": "x"}],
            "summary_pt": "resumo",
        })

        with caplog.at_level(logging.INFO, logger="backend.genai.nodes.pro_sar"):
            audit_deep(state)

        log_entries = [
            json.loads(r.message)
            for r in caplog.records
            if r.name == "backend.genai.nodes.pro_sar"
            and r.message.startswith("{")
            and "model" in r.message
        ]
        assert len(log_entries) >= 1
        entry = log_entries[0]

        assert entry["transaction_id"] == "txn-001"
        assert entry["model"] == "pro"
        assert entry["status"] == "success"
        assert entry["prompt_tokens"] == 120
        assert entry["response_tokens"] == 80
        assert isinstance(entry["duration_ms"], int)

    @patch("backend.genai.nodes.pro_sar._pro_model")
    def test_error_log_fields(self, mock_model, caplog):
        from backend.genai.nodes.pro_sar import audit_deep

        mock_model.generate_content.side_effect = RuntimeError("quota exceeded")

        state = _make_state(score=0.95)
        with caplog.at_level(logging.INFO, logger="backend.genai.nodes.pro_sar"):
            result = audit_deep(state)

        log_entries = [
            json.loads(r.message)
            for r in caplog.records
            if r.name == "backend.genai.nodes.pro_sar"
            and r.message.startswith("{")
            and "model" in r.message
        ]
        assert len(log_entries) >= 1
        entry = log_entries[0]

        assert entry["transaction_id"] == "txn-001"
        assert entry["model"] == "pro"
        assert entry["status"] == "error"
        assert entry["prompt_tokens"] == 0
        assert entry["response_tokens"] == 0
        assert result["processing_status"] == "sar_error"
