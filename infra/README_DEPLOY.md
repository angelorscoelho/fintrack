# FinTrack AI — Deployment Guide (Phase 1: Ingestion Layer)

## Prerequisites

```bash
pip install aws-sam-cli
aws configure  # eu-west-1 region
```

## Deploy

```bash
cd infra
sam validate --lint
sam build
sam deploy
```

## Test Ingestion

After deploy, get the API URL from the stack Outputs (`IngestEndpoint`):

```bash
curl -X POST \
  https://<API_ID>.execute-api.eu-west-1.amazonaws.com/prod/ingest \
  -H 'Content-Type: application/json' \
  -d '{"transaction_id":"test-001","amount":100.00,"merchant_nif":"PT501234567","category":"retail","timestamp":"2025-01-01T10:00:00Z","ip_address":"1.2.3.4","merchant_country":"PT","previous_avg_amount":80.00,"hour_of_day":10,"day_of_week":1,"transactions_last_10min":2}'
```

## Verify Message in SQS

```bash
aws sqs get-queue-attributes \
  --queue-url <SQS_URL> \
  --attribute-names ApproximateNumberOfMessages
```
