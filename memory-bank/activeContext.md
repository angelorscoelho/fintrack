# Active Context

> Short-term memory. Update with UMB command at end of each session.
> Roo reads this at session start to resume without re-investigation.

## Current Focus
Railway runtime debugging for endpoint failures on branch `fix/railway-endpoints-debug-2026-03-31` (debug mode with runtime evidence).

## Recent Changes
- [2026-03-31] Agent: Session bootstrap completed per rules; created branch from updated `main`: `fix/railway-endpoints-debug-2026-03-31`.
- [2026-03-31] Agent: Analyzed Railway logs (`logs.1774939433605.json`, `logs.1774940471961.json`) and confirmed repeated startup crash in GenAI service with `botocore.exceptions.NoRegionError: You must specify a region.` Tracebacks reference `backend/genai/main.py` and `backend/genai/graph.py`.
- [2026-03-31] Agent: Added temporary debug instrumentation to `backend/genai/graph.py`, `backend/genai/main.py`, and `backend/api/main.py` writing NDJSON lines to `debug-64cd1b.log` (session `64cd1b`) for hypothesis testing.
- [2026-03-31] Agent: Applied evidence-backed fix in `backend/genai/graph.py` to initialize DynamoDB resource with explicit region resolution (`AWS_REGION` -> `AWS_DEFAULT_REGION` -> `eu-west-1`) to remove NoRegionError startup failure.
- [2026-03-31] User: Shared Railway UI screenshots and confirmed confusion between two similarly named services; requested strict config checklist before redeploy/health checks.

## Next Steps
1. In Railway, rename services to remove ambiguity (recommended: `fintrack-api-prod` and `fintrack-genai-prod`).
2. Verify per-service settings exactly: Dockerfile path, Start Command, Healthcheck path, Restart policy, retries, and env vars (`AWS_REGION`/`AWS_DEFAULT_REGION`, DynamoDB table, credentials, `GENAI_SERVICE_URL`).
3. Verify domain binding maps API domain to API service and GenAI domain to GenAI service.
4. Redeploy both services.
5. Run health checks and `/api/stats`, then collect fresh API-service logs for post-fix verification.

## Known Issues
- Current provided Railway logs are from GenAI crash loops and do not yet include API request/access evidence for `/api/stats` 404 diagnosis.
- Debug instrumentation must remain in place until post-fix verification is complete and user confirms success.

## Repo workflow (non-negotiable for agents)
- Read `.github/copilot-instructions.md` and obey **git fetch / branch from up-to-date `main`** for feature work.
- `.cursorrules` points agents to those instructions — treat as mandatory.
