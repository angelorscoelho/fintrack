# REVIEW REPORT — S05R — LangGraph Flash XAI

**Date:** 2026-03-18
**Reviewer role:** AI Architect / Peer Reviewer
**Input:** S05E output (`graph.py`, `flash_xai.py`, `genai/main.py`)
**Output goes to:** S06E Executor

---

## GLOBAL RESULT: APPROVED WITH FIXES

---

## CHECKLIST

### LangGraph Structure
- [x] `TransactionState` TypedDict has all required fields: `transaction_id`, `anomaly_score`, `payload`, `ai_explanation`, `sar_draft`, `processing_status`, `error_message` — **PASS** (graph.py L21-28)
- [x] `sar_draft` field exists in state (even if None — S06E will use it) — **PASS** (graph.py L26, initialized to None at L70)
- [x] Graph compiles without error: `get_graph()` runs successfully — **PASS** (verified programmatically: nodes `['__start__', 'analyse_basic', '__end__']`)
- [x] Entry point is `analyse_basic` — **PASS** (graph.py L43)
- [x] Edge from `analyse_basic` → `END` (conditional edge is S06E scope) — **PASS** (graph.py L44)
- [x] Singleton pattern: graph compiled once, reused across requests — **PASS** (graph.py L49-57, verified `g2 is g3 == True`)

### Gemini Flash Configuration
- [x] Model name: `gemini-1.5-flash-latest` — **PASS** (flash_xai.py L25, verified: `models/gemini-1.5-flash-latest`)
- [x] `temperature=0.1` — **PASS** (flash_xai.py L28, verified programmatically)
- [x] `max_output_tokens=512` — **PASS** (flash_xai.py L29, verified programmatically)
- [x] `response_mime_type="application/json"` present — **PASS** (flash_xai.py L30, verified programmatically)

### Prompt Engineering
- [x] System prompt establishes forensic finance expert persona — **PASS** (flash_xai.py L19-22: "especialista sénior em análise forense financeira e auditoria fiscal")
- [x] User prompt includes: amount, previous_avg_amount, ratio, category, hour, day, country, velocity, ip — **PASS** (flash_xai.py L34-54, all 9 fields present)
- [x] JSON schema in prompt specifies exactly 3 bullets with id, icon, text — **PASS** (flash_xai.py L47-51)
- [x] Prompt instructs "NUNCA incluis texto fora do JSON" — **PASS** (flash_xai.py L22)
- [x] Prompt language is Portuguese (as specified) — **PASS** (system prompt in PT, user prompt in PT, bullet icons with PT context)

### Error Handling
- [x] `json.JSONDecodeError` caught separately from generic `Exception` — **PASS** (flash_xai.py L122, L128)
- [x] Failed XAI sets `processing_status = "error"`, `ai_explanation = None` — **PASS** (flash_xai.py L124-126, L130-132)
- [x] Error does NOT raise exception (graceful degradation) — **PASS** (both handlers return state, no re-raise)
- [x] `error_message` field populated on failure — **PASS** (flash_xai.py L126, L132)

### DynamoDB Update
- [x] `run_xai_pipeline` updates DynamoDB after graph completion — **PASS** (graph.py L77-101)
- [x] `ai_explanation` stored as JSON **string** (not dict/map) — **PASS** (flash_xai.py L117: `json.dumps(xai_data, ensure_ascii=False)`)
- [x] Update uses `UpdateExpression` (not `put_item` — which would overwrite) — **PASS** (graph.py L94-97)
- [x] DynamoDB update failure is logged but does NOT crash the service — **PASS** (graph.py L100-101: `except Exception` with `logger.error`)

### Microservice
- [x] `/analyse` endpoint accepts `{transaction_id, anomaly_score, payload}` — **PASS** (main.py L19-23: `AnalyseRequest` Pydantic model)
- [x] `/health` endpoint returns `{"status": "ok"}` — **PASS** (main.py L64-66)
- [x] Graph pre-compiled in lifespan (not per-request) — **PASS** (main.py L25-31: `get_graph()` in `lifespan`)

---

## ISSUES FOUND

### MAJOR-001 — `error_message` NOT persisted to DynamoDB (FIXED)
**Location:** `graph.py` L78-87 (original)
**Description:** When XAI processing fails, `processing_status = "error"` was stored in DynamoDB but `error_message` was NOT included in the `UpdateExpression`. Error diagnostics were only available in service logs, not queryable via API/dashboard.
**Fix applied:** Added `error_message` to DynamoDB update when present (graph.py L89-91).

### MAJOR-002 — Missing tenacity retry for Gemini API calls (FIXED)
**Location:** `flash_xai.py` — PRD mandates "tenacity retry 3×"
**Description:** PRD Stack table requires `tenacity retry 3×` for all Gemini API calls. No retry logic existed in the original `analyse_basic` function. The `tenacity` package was not in `requirements.txt`.
**Fix applied:** Added `_call_flash()` wrapper function with `@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))`. Retries on: `ResourceExhausted` (429), `ServiceUnavailable` (503), `InternalServerError` (500), `DeadlineExceeded` (504). Added `tenacity>=8.2.0` to requirements.txt.

### MINOR-001 — System prompt concatenated instead of using `system_instruction` (FIXED)
**Location:** `flash_xai.py` L85 (original)
**Description:** System prompt was concatenated with user prompt as a single string (`f"{_SYSTEM_PROMPT}\n\n{prompt}"`). Gemini API supports a dedicated `system_instruction` parameter in `GenerativeModel` constructor for proper system/user role separation, which provides better prompt engineering and injection resistance.
**Fix applied:** Moved `_SYSTEM_PROMPT` to `system_instruction` parameter in `GenerativeModel` constructor (flash_xai.py L26).

### MINOR-002 — `assert` used for JSON validation (FIXED)
**Location:** `flash_xai.py` L92-94 (original)
**Description:** Python `assert` statements were used to validate Gemini JSON response. `assert` can be disabled with `-O` (optimize) flag, which would skip validation entirely.
**Fix applied:** Replaced `assert` with explicit `if/raise ValueError()` (flash_xai.py L110-115).

---

## CORRECTED FILES

| File | Changes |
|------|---------|
| `backend/genai/graph.py` | Added `error_message` to DynamoDB `UpdateExpression` (L89-91) |
| `backend/genai/nodes/flash_xai.py` | Added tenacity retry (L77-91), system_instruction (L26), replaced asserts (L110-115) |
| `backend/genai/requirements.txt` | Added `tenacity>=8.2.0` |

---

## NOTES FOR S06E

### Current graph edge structure
- `analyse_basic` → `END` (single edge, no conditional routing)
- S06E must replace `graph.add_edge("analyse_basic", END)` with a conditional edge based on `anomaly_score > 0.90`

### How to add conditional edge without breaking existing logic
```python
def route_after_analysis(state: TransactionState) -> str:
    if state["anomaly_score"] > 0.90 and state["processing_status"] != "error":
        return "audit_deep"
    return END

# Replace: graph.add_edge("analyse_basic", END)
# With:    graph.add_conditional_edges("analyse_basic", route_after_analysis, {"audit_deep": "audit_deep", END: END})
```

### State fields available for S06E
- `transaction_id` (str) — transaction UUID
- `anomaly_score` (float) — ML score [0.0, 1.0]
- `payload` (dict) — full transaction data
- `ai_explanation` (Optional[str]) — JSON string from Flash XAI (populated after `analyse_basic`)
- `sar_draft` (Optional[str]) — Markdown SAR draft (S06E populates this)
- `processing_status` (str) — `pending` → `xai_complete` → `sar_complete` | `error`
- `error_message` (Optional[str]) — error details when `processing_status = "error"`

### Additional notes for S06E
- Tenacity retry is already configured for Flash; S06E must add equivalent retry for Gemini Pro
- `error_message` is now persisted to DynamoDB — S06E `audit_deep` errors will also be stored
- `pro_sar.py` placeholder exists with `audit_deep()` function signature ready for implementation
- Rate limiter integration (DynamoDB atomic counter) should be called BEFORE Gemini API calls
- Gemini Pro model: `gemini-1.5-pro-latest`, temperature should be lower (≈0.05) for SAR drafts
- SSM params: `/fintrack/gemini_flash_daily_limit` (500), `/fintrack/gemini_pro_daily_limit` (100)
