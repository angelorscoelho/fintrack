# Active Context

> Short-term memory. Update with UMB command at end of each session.
> Roo reads this at session start to resume without re-investigation.

## Current Focus
<!-- What is being worked on RIGHT NOW? -->
Deployment analysis and AWS infrastructure verification (2026-03-22)

## Recent Changes
<!-- What was last changed, by which mode, and why? -->
- [2026-03-22] Code mode: Ran AWS CLI checks to verify CloudFormation stack deployment status
- [2026-03-21] Backend/AWS infra deployment completed (SAM deploy ran successfully)

## Open Questions / Blockers
<!-- Unresolved decisions or dependencies blocking progress. -->
1. **CRITICAL**: Lambda `GENAI_SERVICE_URL` still points to `http://localhost:8001` — needs Railway GenAI URL
2. **CRITICAL**: SSM Parameter `/fintrack/gemini_api_key` is MISSING — must be set via `make secrets`
3. SSM parameters for rate limits exist (`/fintrack/gemini_flash_daily_limit`, `/fintrack/gemini_pro_daily_limit`)
4. Railway services (fintrack-api, fintrack-genai) status unknown — need verification
5. Vercel frontend deployment status unknown — need verification

## Next Steps
<!-- Ordered list. Top item = next thing to do. -->
1. Set SSM parameter for Gemini API key: `make secrets` or aws ssm put-parameter
2. Deploy Railway services (fintrack-api, fintrack-genai) and update Lambda GENAI_SERVICE_URL
3. Deploy Vercel frontend with correct environment variables
4. Run end-to-end smoke test: `make test-e2e`
5. Update portfolio vercel.json with FinTrack rewrites
