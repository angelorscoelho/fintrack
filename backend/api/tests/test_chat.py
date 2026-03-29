"""Tests for POST /api/chat."""
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app


@pytest.fixture()
def mock_chat_session():
    mock_response = MagicMock()
    mock_response.text = "Concise fraud insight."

    mock_session = MagicMock()
    mock_session.send_message.return_value = mock_response

    mock_model = MagicMock()
    mock_model.start_chat.return_value = mock_session

    with patch("api.routes.chat.genai") as mock_genai:
        mock_genai.GenerativeModel.return_value = mock_model
        yield mock_genai, mock_session


@pytest.mark.asyncio
async def test_chat_success(mock_chat_session):
    with patch("api.routes.chat.settings") as mock_settings:
        mock_settings.gemini_api_key = "test-key"
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/chat",
                json={
                    "message": "Summarise alerts",
                    "context": {"page": "dashboard"},
                    "history": [],
                },
            )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "Concise fraud insight."
    assert body["error"] is None


@pytest.mark.asyncio
async def test_chat_no_api_key():
    with patch("api.routes.chat.settings") as mock_settings:
        mock_settings.gemini_api_key = ""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/chat",
                json={"message": "Hi", "history": []},
            )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == ""
    assert "not configured" in (body.get("error") or "")
