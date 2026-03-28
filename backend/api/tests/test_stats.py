"""Tests for GET /api/stats – critical unreviewed counting."""
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app


def _make_item(score: float, status: str) -> dict:
    return {"anomaly_score": Decimal(str(score)), "status": status}


FAKE_ITEMS = [
    _make_item(0.95, "PENDING_REVIEW"),   # critical + pending → counted
    _make_item(0.92, "PENDING_REVIEW"),   # critical + pending → counted
    _make_item(0.91, "RESOLVED"),         # critical but resolved → excluded
    _make_item(0.93, "FALSE_POSITIVE"),   # critical but FP → excluded
    _make_item(0.80, "PENDING_REVIEW"),   # high, not critical → excluded
    _make_item(0.10, "NORMAL"),           # low score → excluded
]


@pytest.fixture()
def mock_dynamo_scan():
    """Patch DynamoDB table scan to return FAKE_ITEMS."""
    mock_table = MagicMock()
    mock_table.scan.return_value = {"Items": FAKE_ITEMS}
    with patch("api.db.dynamo.get_table", return_value=mock_table):
        yield


@pytest.mark.asyncio
async def test_critical_counts_only_pending_review(mock_dynamo_scan):
    """Critical must count only score > 0.90 AND status == PENDING_REVIEW."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json()
    # Only 2 items have score > 0.90 AND status PENDING_REVIEW
    assert data["critical"] == 2


@pytest.mark.asyncio
async def test_critical_excludes_resolved_and_false_positive(mock_dynamo_scan):
    """RESOLVED and FALSE_POSITIVE with high scores must NOT be counted."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/stats")
    data = resp.json()
    # Total pending should be 3 (the three PENDING_REVIEW items)
    assert data["pending"] == 3
    assert data["resolved"] == 1
    assert data["false_positives"] == 1
    # Critical excludes resolved/FP
    assert data["critical"] == 2
