# REVIEW REPORT — S07R — FastAPI Core

**Date:** 2026-03-18
**Reviewer:** Tech Lead / Backend Reviewer
**Input:** S07E output (`main.py`, `models.py`, `db/dynamo.py`, `routes/alerts.py`, `routes/stats.py`)

---

## GLOBAL RESULT: APPROVED WITH FIXES

---

## CHECKLIST

| # | Item | Result |
|---|------|--------|
| 1 | `uvicorn backend.api.main:app --port 8000` starts cleanly | ✅ PASS |
| 2 | `GET /health` → HTTP 200 `{"status": "ok"}` | ✅ PASS — returns `{"status":"ok","service":"fintrack-api"}` (extra field, acceptable) |
| 3 | `GET /api/alerts` → valid `AlertListResponse` shape | ✅ PASS |
| 4 | `GET /api/alerts/nonexistent-id` → HTTP 404 | ✅ PASS — `{"detail":"Alert nonexistent-id not found"}` |
| 5 | `AlertResponse.anomaly_score`: `@field_validator` coerces `Decimal` → `float` | ✅ PASS — tested with Decimal, str, None |
| 6 | `_deserialize_item`: parses `ai_explanation` string → dict | ✅ PASS — tested valid JSON, invalid JSON, None, missing key, already dict |
| 7 | DynamoDB `get_alerts_by_status`: uses GSI query when `status` provided | ✅ PASS (after fix) |
| 8 | DynamoDB `get_stats`: uses `scan` with projection | ✅ PASS (after fix — now with pagination) |
| 9 | CORS: `allow_origins` contains ONLY `localhost:3000` and `localhost:5173` | ✅ PASS — confirmed evil.com blocked (400) |
| 10 | `main.py` includes `request_id_middleware` | ✅ PASS — `X-Request-ID` header confirmed in responses |
| 11 | `/docs` (Swagger) loads without errors | ✅ PASS — Swagger UI HTML and OpenAPI JSON served correctly |
| 12 | `routes/resolve.py` and `routes/stream.py` NOT included in routers | ✅ PASS — files exist as placeholders but are NOT imported/registered in main.py |
| 13 | No hardcoded AWS credentials or API keys | ✅ PASS — all config via env vars or pydantic-settings |

---

## ISSUES FOUND AND FIXED

### [MAJOR-1] AlertStatus enum missing `rate_limited` value — FIXED
- **Location:** `backend/api/models.py:8-12`
- **PRD Ref:** Status values: `NORMAL | PENDING_REVIEW | RESOLVED | FALSE_POSITIVE | rate_limited`
- **Problem:** AlertStatus enum did not include `rate_limited`. Transactions with this status from the Lambda rate limiter would fail Pydantic validation.
- **Fix:** Added `RATE_LIMITED = "rate_limited"` to `AlertStatus` enum.

### [MAJOR-2] StatsResponse missing `rate_limited` field — FIXED
- **Location:** `backend/api/models.py:78-85`
- **PRD Ref:** `GET /api/stats includes rate_limited count`
- **Problem:** `StatsResponse` did not include `rate_limited: int` field.
- **Fix:** Added `rate_limited: int` to `StatsResponse`.

### [MAJOR-3] `get_stats()` missing `rate_limited` count and scan pagination — FIXED
- **Location:** `backend/api/db/dynamo.py:78-100`
- **Problem (a):** `get_stats()` did not count `rate_limited` transactions.
- **Problem (b):** `get_stats()` performed a single `scan()` call without handling `LastEvaluatedKey`. DynamoDB scan returns max 1MB per call (~10k items). If the table grows, stats would be silently incomplete.
- **Fix:** Added `rate_limited` counter. Wrapped scan in a `while True` loop checking `LastEvaluatedKey` for full pagination.

### [MAJOR-4] `get_alerts_by_status()` wrong total count + missing scan pagination — FIXED
- **Location:** `backend/api/db/dynamo.py:39-62`
- **Problem (a):** `response.Count` returns the number of items in the current response page, NOT the total number of matching items. The `total` field sent to the client was unreliable.
- **Problem (b):** The scan path (no status filter) did not handle `LastEvaluatedKey` pagination, meaning large tables would return incomplete results.
- **Fix:** For GSI query: added separate `Select="COUNT"` query for accurate total. For scan: added `LastEvaluatedKey` pagination loop with timestamp-based sorting.

---

## MINOR OBSERVATIONS (not fixed — no action required for S08E)

### [MINOR-1] `config.py` created but not used
- `config.py` defines a `Settings` class using `pydantic-settings`, but `main.py` and `dynamo.py` use `os.environ` directly. This is acceptable for PoC — could be unified in a future refactor.

### [MINOR-2] `AlertResponse` missing `processing_status` field
- The DynamoDB schema includes `processing_status` (values: `pending`, `xai_complete`, `sar_complete`, `sar_error`, `error`). This field is not in `AlertResponse`. If the UI needs to show processing state, it should be added. Deferring to S08E executor's discretion.

---

## CORRECTED FILES

1. `backend/api/models.py` — Added `RATE_LIMITED = "rate_limited"` to `AlertStatus`; added `rate_limited: int` to `StatsResponse`
2. `backend/api/db/dynamo.py` — Rewrote `get_alerts_by_status()` with correct total count (GSI COUNT query) and full scan pagination; rewrote `get_stats()` with scan pagination and `rate_limited` counter

---

## NOTES FOR S08E

- **DynamoDB update function interface for resolve endpoint:** `get_alert_by_id()` exists for reads. S08E needs an `update_alert()` function in `db/dynamo.py` for `PUT /api/alerts/{id}/resolve` — should use `UpdateItem` with `SET resolved_at, resolution_type, status` and `ConditionExpression` to ensure alert exists.
- **SSE implementation:** Use `asyncio.Semaphore(3)` for max 3 concurrent SSE connections. Polling approach (5s interval querying DynamoDB for new `PENDING_REVIEW` items) is recommended over DynamoDB Streams given the PoC scope. Use `sse-starlette` library (already in requirements.txt).
- **resolve.py placeholder exists** — replace the placeholder with real implementation using proper Pydantic request model and DynamoDB update.
- **stream.py placeholder exists** — replace with real SSE implementation using `sse-starlette`.
- **processing_status field** — consider adding `Optional[str]` field to `AlertResponse` if the UI will display it.
- **config.py** — consider using the existing `Settings` class instead of raw `os.environ` calls for consistency.
