# Active Context

> Short-term memory. Update with UMB command at end of each session.
> Roo reads this at session start to resume without re-investigation.

## Current Focus
<!-- What is being worked on RIGHT NOW? -->
FinTrack deployment - Ready to copy static files to portfolio (2026-03-22)

## Recent Changes
<!-- What was last changed, by which mode, and why? -->
- [2026-03-22] Code mode: ARCHITECTURE CHANGE - Using Siemens approach (static files in portfolio)
- [2026-03-22] Code mode: Updated frontend/vite.config.js with base: '/poc/fintrack/'
- [2026-03-22] Code mode: Updated angelorscoelho.dev/vercel.json rewrite to /fintrack/index.html
- [2026-03-22] Code mode: Added build:fintrack script to angelorscoelho.dev/package.json
- [2026-03-22] Code mode: Built frontend static files to frontend/dist/
- [2026-03-22] Code mode: Created frontend/vercel.json
- [2026-03-22] Code mode: Updated Lambda GENAI_SERVICE_URL to https://fintrack-genai.railway.app
- [2026-03-22] Code mode: Verified SSM parameters configured successfully
- [2026-03-21] Backend/AWS infra deployment completed

## Deployment Architecture (Siemens Approach)
- Build FinTrack React frontend as static files
- Copy to angelorscoelho.dev/dist/fintrack/
- Rewrite /poc/fintrack/(.*) → /fintrack/index.html (like Siemens)
- Deploy from angelorscoelho.dev with vercel --prod

## Deployment Status
| Component | Status | URL/Value |
|-----------|--------|-----------|
| AWS CloudFormation | ✅ Deployed | stack: fintrack-ai-poc |
| SSM Parameters | ✅ Configured | /fintrack/gemini_api_key |
| Railway fintrack-genai | ✅ Deployed | https://fintrack-genai.railway.app |
| Railway fintrack-api | ✅ Deployed | https://fintrack-api.railway.app |
| Lambda GENAI_SERVICE_URL | ✅ Updated | https://fintrack-genai.railway.app |
| Frontend Built | ✅ Done | frontend/dist/ with base=/poc/fintrack/ |
| Portfolio Rewrites | ✅ Done | /poc/fintrack/(.*) → /fintrack/index.html |
| Portfolio Build Script | ✅ Added | build:fintrack in package.json |
| Portfolio Deploy | ⏳ Pending | vercel --prod in angelorscoelho.dev |

## Next Steps (Continue on another machine)
1. Copy frontend/dist/* to ../angelorscoelho.dev/dist/fintrack/
2. cd ../angelorscoelho.dev && vercel --prod
3. Test: https://angelorscoelho.dev/poc/fintrack/
