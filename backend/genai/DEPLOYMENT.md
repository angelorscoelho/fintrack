# GenAI Service — Railway Deployment Guide

## Overview

The GenAI microservice (`backend/genai/main.py`) is a standalone FastAPI service
that runs the LangGraph + Gemini pipeline for XAI explanations and SAR drafts.
It is called by the Lambda handler (fire-and-forget) for transactions with
`anomaly_score >= 0.70`.

## Prerequisites

| Item | Details |
|------|---------|
| **Railway project** | Same project as `fintrack-api` |
| **Gemini API key** | Google AI Studio → API key |
| **AWS credentials** | IAM user/role with DynamoDB `UpdateItem` on `transactions` table |

## Railway Service Setup

1. **Create a new service** in the existing Railway project.
2. **Connect the same GitHub repo** (`angelorscoelho/fintrack`).
3. Configure the build settings:

| Setting | Value |
|---------|-------|
| **Builder** | `Dockerfile` |
| **Dockerfile Path** | `backend/genai/Dockerfile` |
| **Root Directory** | `/` (repository root — required for `shared/` imports) |
| **Health Check Path** | `/health` |
| **Restart Policy** | `ON_FAILURE` (max 10 retries) |

4. **Assign a public domain** (e.g., `fintrack-genai.railway.app`).

## Required Environment Variables

Set these in the Railway service dashboard:

```
GEMINI_API_KEY=<your-google-ai-studio-key>
AWS_ACCESS_KEY_ID=<iam-access-key>
AWS_SECRET_ACCESS_KEY=<iam-secret-key>
AWS_DEFAULT_REGION=eu-west-1
DYNAMODB_TABLE=transactions
PORT=8001
```

> **Note:** Railway automatically sets `$PORT` — the Dockerfile CMD uses it.
> The `PORT=8001` default is a fallback.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{"status": "ok", "service": "fintrack-genai"}` |
| `POST` | `/analyse` | Analyse a flagged transaction (fire-and-forget) |

### POST `/analyse` Request Body

```json
{
  "transaction_id": "TXN-abc123",
  "anomaly_score": 0.85,
  "payload": {
    "amount": 15000.00,
    "previous_avg_amount": 500.00,
    "category": "wire_transfer",
    "hour_of_day": 3,
    "day_of_week": 6,
    "merchant_country": "CY",
    "transactions_last_10min": 12,
    "ip_address": "203.0.113.42"
  }
}
```

## Lambda Integration

The Lambda handler (`backend/lambda_handler/handler.py`) calls the GenAI service
via the `GENAI_SERVICE_URL` environment variable. Update this in the Lambda
configuration:

```
GENAI_SERVICE_URL=https://fintrack-genai.railway.app
```

## Local Development

```bash
# From repository root
cd /path/to/fintrack

# Install dependencies
pip install -r backend/genai/requirements.txt

# Set env vars
export GEMINI_API_KEY=<key>
export AWS_DEFAULT_REGION=eu-west-1
export DYNAMODB_TABLE=transactions
export PYTHONPATH=$(pwd)

# Run service
uvicorn backend.genai.main:app --host 0.0.0.0 --port 8001 --reload
```

## Docker (Local)

```bash
# Build from repository root (required for shared/ imports)
docker build -f backend/genai/Dockerfile -t fintrack-genai .

# Run
docker run -p 8001:8001 \
  -e GEMINI_API_KEY=<key> \
  -e AWS_ACCESS_KEY_ID=<key> \
  -e AWS_SECRET_ACCESS_KEY=<secret> \
  -e AWS_DEFAULT_REGION=eu-west-1 \
  -e DYNAMODB_TABLE=transactions \
  fintrack-genai
```

## Validation After Deployment

1. **Health check:**
   ```bash
   curl https://fintrack-genai.railway.app/health
   # Expected: {"status":"ok","service":"fintrack-genai"}
   ```

2. **Analyse endpoint (smoke test):**
   ```bash
   curl -X POST https://fintrack-genai.railway.app/analyse \
     -H "Content-Type: application/json" \
     -d '{"transaction_id":"test-001","anomaly_score":0.85,"payload":{"amount":15000,"previous_avg_amount":500,"category":"wire_transfer","hour_of_day":3,"day_of_week":6,"merchant_country":"CY","transactions_last_10min":12,"ip_address":"203.0.113.42"}}'
   # Expected: {"transaction_id":"test-001","processing_status":"xai_complete"}
   ```

3. **End-to-end pipeline:**
   - Send test transaction to SQS (score ≥ 0.70)
   - Monitor CloudWatch for successful GenAI call
   - Verify DynamoDB contains `ai_explanation` JSON object
   - Confirm frontend displays AI explanation

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `/analyse` returns 404 | Wrong Dockerfile or start command | Verify Dockerfile path = `backend/genai/Dockerfile` and Root Directory = `/` |
| Import errors in logs | PYTHONPATH not set | Dockerfile sets `ENV PYTHONPATH=/app` — verify it's not overridden |
| 500 on `/analyse` | Missing `GEMINI_API_KEY` | Set in Railway env vars |
| DynamoDB update fails | Missing AWS credentials | Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` |
| Rate limited | Daily Gemini quota exceeded | Check rate_limiter DynamoDB entries; wait for TTL reset |
