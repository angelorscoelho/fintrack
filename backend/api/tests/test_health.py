"""Tests for Gemini health-check endpoints."""
import asyncio
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app


@pytest.fixture()
def mock_generate():
    """Patch google.generativeai so no real API calls are made."""
    mock_response = MagicMock()
    mock_response.text = "OK"

    mock_model_instance = MagicMock()
    mock_model_instance.generate_content.return_value = mock_response

    with patch("api.routes.health.genai") as mock_genai:
        mock_genai.GenerativeModel.return_value = mock_model_instance
        yield mock_genai, mock_model_instance


@pytest.fixture()
def mock_generate_flash_error():
    """Patch so Flash fails and Pro succeeds."""
    mock_ok = MagicMock()
    mock_ok.text = "OK"

    def model_factory(model_name, **kwargs):
        m = MagicMock()
        if "flash" in model_name:
            m.generate_content.side_effect = RuntimeError("Flash unavailable")
        else:
            m.generate_content.return_value = mock_ok
        return m

    with patch("api.routes.health.genai") as mock_genai:
        mock_genai.GenerativeModel.side_effect = model_factory
        yield mock_genai


@pytest.fixture()
def mock_generate_timeout():
    """Patch so model calls block beyond the timeout."""
    def slow_generate(*args, **kwargs):
        import time
        time.sleep(10)

    mock_model_instance = MagicMock()
    mock_model_instance.generate_content.side_effect = slow_generate

    with patch("api.routes.health.genai") as mock_genai:
        mock_genai.GenerativeModel.return_value = mock_model_instance
        # Reduce timeout for fast tests
        with patch("api.routes.health._TIMEOUT_SECONDS", 0.5):
            yield mock_genai


# ── GET /api/health/gemini ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_gemini_health_ok(mock_generate):
    """Both models respond — expect 'ok' for both."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/health/gemini")

    assert resp.status_code == 200
    body = resp.json()
    assert body["gemini_flash"] == "ok"
    assert body["gemini_pro"] == "ok"
    assert isinstance(body["latency_flash_ms"], (int, float))
    assert isinstance(body["latency_pro_ms"], (int, float))
    assert body["error_message"] is None


@pytest.mark.asyncio
async def test_gemini_health_partial_failure(mock_generate_flash_error):
    """Flash fails, Pro succeeds — expect mixed status."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/health/gemini")

    assert resp.status_code == 200
    body = resp.json()
    assert body["gemini_flash"] == "error"
    assert body["gemini_pro"] == "ok"
    assert body["error_message"] is not None
    assert "flash" in body["error_message"].lower() or "Flash" in body["error_message"]


@pytest.mark.asyncio
async def test_gemini_health_timeout(mock_generate_timeout):
    """Models exceed timeout — expect error with timeout message."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/health/gemini")

    assert resp.status_code == 200
    body = resp.json()
    assert body["gemini_flash"] == "error"
    assert body["gemini_pro"] == "error"
    assert "timeout" in body["error_message"].lower()


# ── GET /health (includes Gemini state) ────────────────────────────────


@pytest.mark.asyncio
async def test_health_includes_gemini_ok(mock_generate):
    """Main /health endpoint includes gemini sub-object."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/health")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"] == "fintrack-api"
    assert "gemini" in body
    assert body["gemini"]["status"] == "ok"
    assert body["gemini"]["gemini_flash"] == "ok"
    assert body["gemini"]["gemini_pro"] == "ok"


@pytest.mark.asyncio
async def test_health_degraded_on_gemini_failure(mock_generate_flash_error):
    """/health reports 'degraded' when a Gemini model is down."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/health")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["gemini"]["status"] == "error"


# ── Response shape validation ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_gemini_health_response_shape(mock_generate):
    """Verify all expected keys are present in the response."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/health/gemini")

    body = resp.json()
    expected_keys = {
        "gemini_flash",
        "gemini_pro",
        "latency_flash_ms",
        "latency_pro_ms",
        "error_message",
    }
    assert set(body.keys()) == expected_keys
