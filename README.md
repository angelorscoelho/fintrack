# Copyright 2026 Ângelo Coelho — PROPRIETARY / NON-COMMERCIAL USE ONLY
> **PROPRIETARY / NON-COMMERCIAL USE ONLY**
>
> This repository is source-available strictly for review. Recruiters and tech leads may read the code to evaluate skills and architecture. Companies and for-profit entities are prohibited from using, copying, or integrating this code for commercial gain.
> If your company wishes to commercialize or incorporate this work, you must hire or license it from Ângelo Coelho — contact: https://angelorscoelho.dev

# FinTrack AI — Fraud Detection & Fiscal Anomaly Tracking PoC

Serverless AI-powered fraud detection system built on AWS + Google Gemini API.

## Stack
- **Ingestion**: AWS API Gateway → SQS → Lambda (Python 3.11, Container Image)
- **ML**: scikit-learn IsolationForest
- **GenAI**: LangGraph + Gemini 1.5 Flash (XAI) + Gemini 1.5 Pro (SAR)
- **API**: FastAPI + Uvicorn (Railway)
- **Dashboard**: React 18 + Vite + TanStack Table + shadcn/ui (Vercel)

---

## Deployment Guide

### Prerequisites

1. **AWS CLI** configured with `fintrack-deploy` user credentials
   ```bash
   aws configure
   # Access Key ID: [fintrack-deploy key]
   # Secret Access Key: [fintrack-deploy secret]
   # Region: eu-west-1
   # Output: json

   # Verify configuration:
   aws sts get-caller-identity
   ```

2. **SAM CLI** installed
   ```bash
   pip install aws-sam-cli
   ```

3. **Docker** running (for Lambda container builds)

4. **Gemini API Key** from [Google AI Studio](https://aistudio.google.com)

---

### Step 1: Configure SSM Parameters (Secrets)

```bash
# Set your Gemini API key
export GEMINI_API_KEY="AIza..."

# Create SSM parameters
aws ssm put-parameter \
  --name "/fintrack/gemini_api_key" \
  --value "$GEMINI_API_KEY" \
  --type SecureString \
  --region eu-west-1 \
  --overwrite

aws ssm put-parameter \
  --name "/fintrack/gemini_flash_daily_limit" \
  --value "500" \
  --type String \
  --region eu-west-1 \
  --overwrite

aws ssm put-parameter \
  --name "/fintrack/gemini_pro_daily_limit" \
  --value "100" \
  --type String \
  --region eu-west-1 \
  --overwrite

# Verify:
aws ssm get-parameter --name "/fintrack/gemini_api_key" --with-decryption --region eu-west-1
```

Or use the Makefile target:
```bash
make secrets
```

---

### Step 2: Train ML Model

```bash
make train
```

This generates:
- `backend/lambda_layer/model.pkl` (~1.6MB IsolationForest model)
- `data/synthetic_transactions.csv` (1000 sample transactions)
- `data/training_report.json`

---

### Step 3: Deploy AWS Infrastructure

```bash
# Full automated deployment (deletes existing stack, builds & deploys):
./scripts/deploy.sh

# Or manual steps:
cd infra
sam build --template-file template.yaml --build-dir .aws-sam/build --region eu-west-1
sam deploy \
  --template-file template.yaml \
  --stack-name fintrack-ai-poc \
  --resolve-image-repos \
  --region eu-west-1 \
  --disable-rollback \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

**Stack Outputs:**
- `IngestEndpoint`: `https://{apiId}.execute-api.eu-west-1.amazonaws.com/dev/ingest`
- `DynamoDBTableName`: `transactions`
- `RateLimiterTableName`: `gemini_rate_limiter`
- `SQSQueueUrl`: `https://sqs.eu-west-1.amazonaws.com/{account}/fintrack-transactions-queue-dev`
- `LambdaFunctionArn`: `arn:aws:lambda:eu-west-1:{account}:function:fintrack-transaction-processor`

**Verify deployment:**
```bash
aws cloudformation describe-stacks \
  --stack-name fintrack-ai-poc \
  --region eu-west-1 \
  --query "Stacks[0].Outputs" \
  --output table
```

---

### Step 4: Deploy Railway Services

#### 4a. Create Railway Project
1. Go to [Railway](https://railway.app) → Login with GitHub
2. Create new project → Deploy from GitHub repo: `angelorscoelho/fintrack`

#### 4b. Deploy fintrack-api
- Root Directory: `backend/api`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment Variables:
  ```
  DYNAMODB_TABLE=transactions
  RATE_LIMITER_TABLE=gemini_rate_limiter
  AWS_REGION=eu-west-1
  AWS_ACCESS_KEY_ID=[RUNTIME_AWS_ACCESS_KEY_ID]
  AWS_SECRET_ACCESS_KEY=[RUNTIME_AWS_SECRET_ACCESS_KEY]
  GEMINI_API_KEY=[your Gemini key]
  GENAI_SERVICE_URL=https://[fintrack-genai].railway.app
  ALLOWED_ORIGINS=https://angelorscoelho.dev,https://[FINTRACK_VERCEL_URL]
  ```

#### 4c. Deploy fintrack-genai
- Root Directory: `backend/genai`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment Variables:
  ```
  DYNAMODB_TABLE=transactions
  RATE_LIMITER_TABLE=gemini_rate_limiter
  AWS_REGION=eu-west-1
  AWS_ACCESS_KEY_ID=[RUNTIME_AWS_ACCESS_KEY_ID]
  AWS_SECRET_ACCESS_KEY=[RUNTIME_AWS_SECRET_ACCESS_KEY]
  GEMINI_API_KEY=[your Gemini key]
  GEMINI_FLASH_DAILY_LIMIT=500
  GEMINI_PRO_DAILY_LIMIT=100
  ```

#### 4d. Verify Railway services:
```bash
curl https://[fintrack-api].railway.app/health
curl https://[fintrack-genai].railway.app/health
```

---

### Step 5: Update Lambda with Railway URL

After deploying fintrack-genai, update Lambda configuration:

```bash
aws lambda update-function-configuration \
  --function-name fintrack-transaction-processor \
  --region eu-west-1 \
  --environment "Variables={DYNAMODB_TABLE=transactions,RATE_LIMITER_TABLE=gemini_rate_limiter,GENAI_SERVICE_URL=https://[fintrack-genai].railway.app}"
```

---

### Step 6: Deploy Vercel Frontend

```bash
cd frontend

# Configure environment variables
vercel env add VITE_API_URL production
# Value: https://[fintrack-api].railway.app

vercel env add VITE_BASE_PATH production
# Value: /poc/fintrack/

vercel env add VITE_INACTIVITY_TIMEOUT_MS production
# Value: 1800000

vercel env add VITE_SSE_POLL_INTERVAL_MS production
# Value: 5000

# Deploy to production
vercel --prod
```

---

### Step 7: Update Portfolio Rewrites

In your main portfolio repo (`angelorscoelho.dev`), update `vercel.json` with:

```json
{
  "rewrites": [
    { "source": "/poc/fintrack/(.*)", "destination": "https://fintrack-poc.vercel.app/$1" },
    { "source": "/siemens", "destination": "/poc/industrial-smart-dashboard" }
  ]
}
```

Then deploy:
```bash
cd [portfolio-repo]
vercel --prod
```

---

### Step 8: Verify End-to-End

```bash
# Get the ingestion endpoint
export ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name fintrack-ai-poc \
  --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='IngestEndpoint'].OutputValue" \
  --output text)

# Run smoke test
make test-e2e

# Or manually:
# 1. Open https://angelorscoelho.dev/poc/fintrack
# 2. Open DevTools → Network → filter for SSE
# 3. You should see real-time alerts appearing
```

---

## Local Development

### 1. Infrastructure (AWS SAM)
```bash
cd infra
sam build
sam deploy
```

### 2. Lambda Layer (ML dependencies)
```bash
pip install scikit-learn numpy -t backend/lambda_layer/python/
# Train model first
python data/train_model.py
```

### 3. GenAI Service
```bash
cd backend/genai
pip install -r requirements.txt
uvicorn main:app --port 8001
```

### 4. API
```bash
cd backend/api
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

### 5. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Development Progress
See `/docs/sessions/` for session cards and review reports.
