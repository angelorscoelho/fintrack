# ═══════════════════════════════════════════════════
# REVIEW REPORT — S02R — DynamoDB + Lambda
# GLOBAL RESULT: APPROVED WITH FIXES
# ═══════════════════════════════════════════════════

**Reviewer:** Cloud Security Engineer / SecOps  
**Date:** 2026-03-18  
**Input:** S02E output (`template.yaml` lines 116–322 + `handler.py` + `rate_limiter.py`)  
**Validation:** `sam validate --lint` ✅ | `cfn-lint` ✅ (0 errors, 0 warnings)

---

## CHECKLIST RESULTS

### DynamoDB
- [x] **PASS** — Table name is exactly `transactions` (line 120)
- [x] **PASS** — `BillingMode: PAY_PER_REQUEST` (line 121)
- [x] **PASS** — PK: `transaction_id` (String), HASH only (lines 122–131)
- [x] **PASS** — GSI: `status-timestamp-index`, PK=`status`, SK=`timestamp` (lines 132–140)
- [x] **PASS** — GSI projection: `ALL` (line 140)
- [x] **PASS** — TTL enabled on field `ttl` (lines 141–143)
- [x] **PASS** — No `ProvisionedThroughput` anywhere in table definitions

### Lambda
- [x] **PASS** — `Runtime: python3.11` (Globals, line 7)
- [x] **PASS** — `BatchSize: 1` (line 272)
- [x] **PASS** — `FunctionResponseTypes: [ReportBatchItemFailures]` (line 273)
- [x] **PASS** — Event source is `TransactionsQueue` (not DLQ) (line 271)
- [x] **PASS** — SQS VisibilityTimeout (60s) > Lambda Timeout (30s)

### IAM (Critical)
- [x] **PASS** — Lambda role trusts `lambda.amazonaws.com` only (lines 198–204)
- [x] **PASS** — SQS policy: ONLY `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` (lines 213–216)
- [x] **PASS** — DynamoDB policy: ONLY `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:GetItem` (lines 223–226)
- [x] **PASS** — DynamoDB resource includes both table ARN and `/index/*` (lines 228–229)
- [x] **PASS** — SSM policy: ONLY `ssm:GetParameter` on `/fintrack/*` path (lines 244–246) — **FIXED** (removed `ssm:GetParameters`)
- [x] **PASS** — No `*` wildcard in any Action field; Resource wildcards are correctly scoped (`/index/*` for GSI, `/fintrack/*` for SSM)
- [x] **PASS** — `AWSLambdaBasicExecutionRole` managed policy present (line 206) — verified correct 6-part ARN

### handler.py Logic
- [x] **PASS** — Processes `event["Records"]` in a loop (line 33)
- [x] **PASS** — Returns `{"batchItemFailures": [...]}` correct shape (line 47)
- [x] **PASS** — `anomaly_score` stored as `str(score)` — String in DynamoDB (line 63)
- [x] **PASS** — GenAI invocation has `timeout=2` — non-blocking (line 112, `GENAI_INVOKE_TIMEOUT = 2`)
- [x] **PASS** — GenAI failure caught and logged as warning, does NOT raise (lines 114–116)
- [x] **PASS** — Structured JSON logging used throughout (all `logger.*` calls use `json.dumps()`)

### S01E Preservation
- [x] **PASS** — `TransactionsDLQ` unchanged (lines 20–29)
- [x] **PASS** — `TransactionsQueue` unchanged (lines 32–44)
- [x] **PASS** — `ApiGatewayToSQSRole` unchanged (lines 47–66)
- [x] **PASS** — `FinTrackHttpApi` unchanged (lines 69–84)
- [x] **PASS** — `IngestEndpoint` output unchanged (lines 276–280)

---

## ISSUES FOUND

### MINOR-1: Extra SSM permission `ssm:GetParameters` (FIXED)
- **File:** `infra/template.yaml`, line 246 (pre-fix)
- **Description:** SSMReadPolicy included both `ssm:GetParameter` and `ssm:GetParameters`. The checklist and least-privilege principle require only `ssm:GetParameter`. The plural form allows batch retrieval which is unnecessary.
- **Fix applied:** Removed `ssm:GetParameters` from SSMReadPolicy. Only `ssm:GetParameter` remains.

### MINOR-2: Lambda IAM role name not parameterized (FIXED)
- **File:** `infra/template.yaml`, line 197 (pre-fix)
- **Description:** `RoleName: fintrack-lambda-role` was hardcoded without `${Environment}` suffix, unlike all other named resources. Deploying multiple environments in the same account would cause a name collision.
- **Fix applied:** Changed to `RoleName: !Sub 'fintrack-lambda-role-${Environment}'`

### MINOR-3: SSM parameters created but not dynamically consumed (NOTE — not fixed)
- **File:** `infra/template.yaml` (lines 165–179) + `backend/lambda_handler/rate_limiter.py` (lines 21–22)
- **Description:** SSM parameters `/fintrack/gemini_flash_daily_limit` (500) and `/fintrack/gemini_pro_daily_limit` (100) are created in CloudFormation but never consumed by the Lambda function. The rate_limiter.py reads from env vars `GEMINI_FLASH_DAILY_LIMIT` / `GEMINI_PRO_DAILY_LIMIT` with hardcoded defaults (500/100). These defaults match the SSM values, so behavior is correct.
- **Recommendation for future session:** Add SSM dynamic references to Lambda env vars (resolved at deploy time, not runtime):
  ```yaml
  GEMINI_FLASH_DAILY_LIMIT: !Sub '{{resolve:ssm:/fintrack/gemini_flash_daily_limit}}'
  GEMINI_PRO_DAILY_LIMIT: !Sub '{{resolve:ssm:/fintrack/gemini_pro_daily_limit}}'
  ```
  Note: `{{resolve:ssm:...}}` resolves at CloudFormation deployment time. To change limits without redeployment, the Lambda would need to call `ssm:GetParameter` at runtime instead.
- **Not fixed now:** Since defaults match and this is a PoC, deferring to keep changes minimal.

---

## CORRECTED FILES

### infra/template.yaml — Changes applied:
1. **Line 197:** `RoleName: fintrack-lambda-role` → `RoleName: !Sub 'fintrack-lambda-role-${Environment}'`
2. **Line 246:** Removed `- 'ssm:GetParameters'` from SSMReadPolicy actions

### handler.py — No changes needed
All checklist items pass. Implementation is solid.

### rate_limiter.py — No changes needed
Atomic DynamoDB counter pattern is correctly implemented.

---

## VALIDATION POST-FIX

```
$ sam validate --lint -t template.yaml
template.yaml is a valid SAM Template ✅

$ cfn-lint template.yaml
(0 errors, 0 warnings) ✅
```

---

## NOTES FOR S03E (Data Generator)

1. **DynamoDB table name:** `transactions` — use this exact name
2. **PK:** `transaction_id` (String, UUID v4) — generator must produce valid UUIDs
3. **Required fields per PRD:** `transaction_id`, `timestamp`, `merchant_nif`, `merchant_name`, `amount`, `category`, `ip_address`, `merchant_country`, `previous_avg_amount`, `hour_of_day`, `day_of_week`, `transactions_last_10min`
4. **Data types:** All fields are Strings in DynamoDB except: `amount` / `previous_avg_amount` (Number), `hour_of_day` / `day_of_week` / `transactions_last_10min` (Number). Note: `anomaly_score` is stored as String (`str(score)`) by the Lambda to avoid DynamoDB Decimal issues — generator does NOT set this field.
5. **Ingestion path:** POST to API Gateway `/ingest` endpoint → SQS → Lambda. Generator should POST JSON payloads to the ingest endpoint.
6. **anomaly_score:** Lambda stores as String (`str(score)`) to avoid DynamoDB Decimal issues
7. **TTL field:** Set by Lambda for NORMAL records (7 days); generator should NOT set `ttl`
8. **Status values:** Set by Lambda (`NORMAL`, `PENDING_REVIEW`, `rate_limited`); generator should NOT set `status`
9. **GenAI service URL:** Currently `localhost:8001` — must be running for XAI/SAR processing
10. **ML scorer:** Currently returns 0.5 (placeholder) — all transactions will be classified as NORMAL until S04E implements the real model

# ═══════════════════════════════════════════════════
# END OF REVIEW REPORT — S02R
# ═══════════════════════════════════════════════════
