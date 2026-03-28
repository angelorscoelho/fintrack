# FinTrack AI — GitHub Copilot Context

## Project
Serverless fraud detection PoC: AWS Lambda + DynamoDB + LangGraph + Gemini API + React.

## Stack
- Python 3.12: FastAPI, boto3, scikit-learn, langgraph, google-generativeai
- AWS: Lambda, SQS, DynamoDB, API Gateway (SAM IaC)
- Frontend: React 18, Vite, TanStack Table v8, shadcn/ui, Tailwind CSS

## Critical Rules
- DynamoDB table: `transactions`, PK: `transaction_id` (String)
- Lambda: NEVER make sync HTTP calls during SQS processing
- GenAI only for anomaly_score >= 0.70; Gemini Pro only for score > 0.90
- `ai_explanation` stored as JSON **string** in DynamoDB
- IAM: least-privilege only
- CORS: localhost:3000 and localhost:5173 only

## Key Files
- IaC: infra/template.yaml
- Lambda: backend/lambda_handler/handler.py
- ML scorer: backend/lambda_handler/ml_scorer.py
- API: backend/api/main.py
- GenAI graph: backend/genai/graph.py
- Dashboard: frontend/src/App.jsx

## Memory Bank Protocol
- Agents and Copilot: ALWAYS read `.roo/rules/01-memory-bank-protocol.md` at the start of every session. This file prescribes the memory-bank workflow (what to read at session start, the UMB update flow, and forbidden actions) and should be used as authoritative guidance for handling files under `memory-bank/`.
