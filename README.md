# Copyright 2026 Ângelo Coelho — PROPRIETARY / NON-COMMERCIAL USE ONLY
> **PROPRIETARY / NON-COMMERCIAL USE ONLY**
>
> This repository is source-available strictly for review. Recruiters and tech leads may read the code to evaluate skills and architecture. Companies and for-profit entities are prohibited from using, copying, or integrating this code for commercial gain.
> If your company wishes to commercialize or incorporate this work, you must hire or license it from Ângelo Coelho — contact: https://angelorscoelho.dev

# FinTrack AI — Fraud Detection & Fiscal Anomaly Tracking PoC

Serverless AI-powered fraud detection system built on AWS + Google Gemini API.

## Stack
- **Ingestion**: AWS API Gateway → SQS → Lambda (Python 3.11)
- **ML**: scikit-learn IsolationForest
- **GenAI**: LangGraph + Gemini 1.5 Flash (XAI) + Gemini 1.5 Pro (SAR)
- **API**: FastAPI + Uvicorn
- **Dashboard**: React 18 + Vite + TanStack Table + shadcn/ui

## Setup

### 1. Infrastructure (AWS SAM)
```bash
cd infra
sam build
sam deploy
```

### 2. Lambda Layer (ML dependencies)
```bash
pip install scikit-learn numpy -t backend/lambda_layer/python/
# Train model first (Session S04E)
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

## Development Progress
See `/docs/sessions/` for session cards and review reports.
