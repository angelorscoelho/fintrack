# Product Context

> First file read at session start (with activeContext + systemPatterns).

## Project Overview
**FinTrack AI** — serverless fraud-detection PoC: AWS Lambda + DynamoDB, ML scoring, optional GenAI (LangGraph + Gemini), React dashboard (Vite, shadcn/ui, Tailwind). Analysts review **pending high-risk** transactions and charts on the Command Center.

## Tech Stack
- **Backend:** Python 3.12, FastAPI, boto3, scikit-learn; AWS Lambda, API Gateway, DynamoDB, SQS.
- **Frontend:** React 18, Vite, TanStack Table / Query, Recharts, Tailwind, react-router-dom.
- **Data:** DynamoDB table `transactions`, PK `transaction_id`.
- **Shared:** `shared/project_constants.json` — score thresholds, API limits, UI config.

## Architecture Summary
- Ingest → SQS → Lambda (ML + optional async GenAI) → DynamoDB.
- REST API for alerts, stats, transactions; SSE for live alert stream on dashboard.
- Dashboard: KPIs, volume chart, category chart, **high-risk feed (Card 9)**, map.

## Constraints & Non-Negotiables
- Follow `.github/copilot-instructions.md` and `.cursorrules` (git workflow, DynamoDB keys, no sync HTTP in SQS handler, CORS, shared constants).
- Do not duplicate threshold values — use `project_constants.json` / `THRESHOLDS` on the frontend.

## Serena Language Config
- Primary language for Serena indexing: **typescript** | **javascript** (frontend); Python in backend — match `.serena/project.yml` if present.
