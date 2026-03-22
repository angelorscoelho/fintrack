# Active Context

> Short-term memory. Update with UMB command at end of each session.
> Roo reads this at session start to resume without re-investigation.

## Current Focus
<!-- What is being worked on RIGHT NOW? -->
FinTrack deployment - Vercel frontend ready to deploy (2026-03-22)

## Recent Changes
<!-- What was last changed, by which mode, and why? -->
- [2026-03-22] Code mode: Created frontend/vercel.json
- [2026-03-22] Code mode: Updated Lambda GENAI_SERVICE_URL to https://fintrack-genai.railway.app
- [2026-03-22] Code mode: Verified SSM parameters configured successfully
- [2026-03-21] Backend/AWS infra deployment completed

## Deployment Status
| Component | Status | URL/Value |
|-----------|--------|-----------|
| AWS CloudFormation | ✅ Deployed | stack: fintrack-ai-poc |
| SSM Parameters | ✅ Configured | /fintrack/gemini_api_key |
| Railway fintrack-genai | ✅ Deployed | https://fintrack-genai.railway.app |
| Railway fintrack-api | ✅ Deployed | https://fintrack-api.railway.app |
| Lambda GENAI_SERVICE_URL | ✅ Updated | https://fintrack-genai.railway.app |
| Vercel Frontend | ⏳ Needs Deploy | Set VITE_API_URL=https://fintrack-api.railway.app |
| Portfolio Rewrites | ⏳ Needs Config | Add to angelorscoelho.dev/vercel.json |

## Next Steps
<!-- Ordered list. Top item = next thing to do. -->
1. Deploy Vercel frontend: cd frontend && vercel --prod
2. Add FinTrack rewrite to angelorscoelho.dev/vercel.json
3. Run smoke test: make test-e2e
