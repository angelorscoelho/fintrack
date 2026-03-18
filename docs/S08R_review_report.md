# REVIEW REPORT — S08R

**GLOBAL RESULT: APPROVED WITH FIXES**

---

## CHECKLIST

### AlertStatus / Models
- [x] **PASS** — `AlertStatus` enum has `RATE_LIMITED = "rate_limited"` entry (models.py:13)
- [x] **PASS** — `StatsResponse` has `rate_limited: int` field (models.py:85)
- [x] **PASS** — `StatsResponse` has `rate_limits: dict` field (models.py:88)

### Resolve Endpoint
- [x] **PASS** — `PUT /resolve` with unknown id → HTTP 404 (resolve.py:29-30)
- [x] **PASS** — `PUT /resolve` on already resolved → HTTP 409 (resolve.py:31-32)
- [x] **PASS** — `FALSE_POSITIVE` → `status = "FALSE_POSITIVE"` in DynamoDB (resolve.py:34-38)
- [x] **PASS** — DynamoDB `update_item` sets `status`, `resolution_type`, `resolved_at`, `analyst_notes` (dynamo.py:116-129)
- [x] **PASS** — `resolved_at` is ISO 8601 UTC string (resolve.py:43 — `datetime.now(timezone.utc).isoformat()`)

### SSE Stream — Critical Checks
- [x] **PASS** — `asyncio.Semaphore(3)` declared at module level (stream.py:22)
- [x] **PASS (FIXED)** — 4th simultaneous connection → HTTP 503 before opening stream (stream.py:36-41 — **see MAJOR #1 below**)
- [x] **PASS** — Poll interval = exactly 5 seconds (`POLL_INTERVAL = 5`, stream.py:23)
- [x] **PASS** — `json.dumps(alert, default=_decimal_safe)` — NOT `default=str` (stream.py:58)
- [x] **PASS** — `_decimal_safe` returns `float(obj)` for Decimal — NOT `str(obj)` (dynamo.py:31)
- [x] **PASS** — Heartbeat: `: heartbeat\n\n` (colon prefix = SSE comment) (stream.py:60)
- [x] **PASS** — `asyncio.CancelledError` caught — logs "connection closed" cleanly (stream.py:67-68)
- [x] **PASS** — Response headers include `Cache-Control: no-cache` and `X-Accel-Buffering: no` (stream.py:77-78)

### Stats
- [x] **PASS** — `get_stats()` counts items with `status == "rate_limited"` separately (dynamo.py:176)
- [x] **PASS** — `get_stats()` calls `get_today_counts()` and includes result as `rate_limits` (dynamo.py:184-185)
- [x] **PASS** — No full scan without projection (uses `ProjectionExpression`) (dynamo.py:160-162 for stats; dynamo.py:138-142 for SSE)

### Router Registration
- [x] **PASS** — `resolve.router` registered in `main.py` (main.py:44)
- [x] **PASS** — `stream.router` registered in `main.py` (main.py:41)
- [x] **PASS** — `/docs` Swagger loads without errors with all 5 route files (verified: 6 endpoints registered)

---

## ISSUES

### MAJOR #1 — SSE Semaphore Race Condition (stream.py:34-42) — **FIXED**

**Problem:** The original code peeked at `_SSE_SEMAPHORE._value > 0` without acquiring, then deferred acquisition to `async with _SSE_SEMAPHORE` inside the generator. Since the generator executes lazily (after the StreamingResponse is returned), multiple concurrent requests could all pass the peek check before any generator starts iterating. The 4th connection would then block on `async with` instead of receiving HTTP 503.

**Fix applied:** Semaphore is now acquired in the handler (`await _SSE_SEMAPHORE.acquire()`) immediately after the check, before returning the StreamingResponse. Release is done in the generator's `finally` block. Since `acquire()` returns immediately when `_value > 0` (no event-loop yield), the check + acquire pair is atomic in single-threaded asyncio.

**File:** `backend/api/routes/stream.py` — lines 33-41 (check + acquire), line 70 (release in finally)

---

## MINOR OBSERVATIONS (no fix required)

1. **`config.py` unused** — `dynamo.py` uses `os.environ` directly instead of the `Settings` class. Acceptable for PoC, but S09E may consider unifying if new env vars are needed.
2. **`processing_status` not in `AlertResponse`** — If the frontend needs to display processing state, this field should be added. Not blocking for S08R.
3. **`get_latest_alerts()` uses Scan** — For PoC scale this is fine. At production scale, a GSI on `processed_at` would be preferable.
4. **`Decimal` import unused** — stream.py imports `Decimal` (line 10) but uses `_decimal_safe` from dynamo.py. Minor — not blocking.

---

## CORRECTED FILES

| File | Change |
|------|--------|
| `backend/api/routes/stream.py` | Semaphore acquired in handler before StreamingResponse; released in generator finally block |

---

## NOTES FOR S09E

- **API shapes confirmed for React component props:**
  - `AlertResponse`: 15+ fields including `transaction_id`, `timestamp`, `amount`, `anomaly_score`, `status`, `ai_explanation`, `sar_draft`, `resolved_at`, `resolution_type`, `analyst_notes`
  - `StatsResponse`: `{total, pending, critical, resolved, false_positives, rate_limited, fp_rate, avg_score, rate_limits}`
- **SSE URL:** `GET /api/alerts/stream` — sends `data: {JSON}\n\n` events + `: heartbeat\n\n` comments
- **Resolve:** `PUT /api/alerts/{id}/resolve` body: `{resolution_type: "CONFIRMED_FRAUD"|"FALSE_POSITIVE"|"ESCALATED", analyst_notes: ""}`
- **503 on 4th SSE** — frontend must handle this gracefully (e.g., sonner toast + retry after delay)
- **Resolution types:** CONFIRMED_FRAUD → status=RESOLVED, FALSE_POSITIVE → status=FALSE_POSITIVE, ESCALATED → status=RESOLVED
- **Route order:** stream.router is registered BEFORE alerts.router to avoid `{transaction_id}` path param conflict
