# FinTrack AI — GitHub Copilot Context

**This file is the primary general agent instructions document for this repository.** Use it for stack, rules, workflow, and key paths. For `memory-bank/` files specifically, follow `.roo/rules/01-memory-bank-protocol.md` (UMB workflow and forbidden actions).

## Agent session workflow

1. Run `git fetch` (and `git pull` on `main` when using a local tracking branch) so refs are current.
2. Branch **from up-to-date `main`** for feature work: `git checkout main && git pull` then `git checkout -b <branch-name>`.
3. Use descriptive branch names (e.g. `feat/…`, `fix/…`) that reflect the task.

## Project

Serverless fraud detection PoC: AWS Lambda + DynamoDB + LangGraph + Gemini API + React.

**Repository notice:** The [README.md](../README.md) states licensing and proprietary use restrictions; respect that context when suggesting reuse or distribution.

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
- Shared constants: Whenever creating or editing code that introduces hardcoded values, put them in `shared/project_constants.json` as the single source of truth instead of hardcoding.
  - Keep `shared/project_constants.json` authoritative; avoid duplicating values across backend and frontend—import or load from this shared location in both contexts.

## Key Files

- IaC: infra/template.yaml
- Lambda: backend/lambda_handler/handler.py
- ML scorer: backend/lambda_handler/ml_scorer.py
- API: backend/api/main.py
- GenAI graph: backend/genai/graph.py
- Dashboard: frontend/src/App.jsx

## Memory Bank Protocol

Agents and Copilot: ALWAYS read `.roo/rules/01-memory-bank-protocol.md` at the start of every session. This file prescribes the memory-bank workflow (what to read at session start, the UMB update flow, and forbidden actions) and should be used as authoritative guidance for handling files under `memory-bank/`.
