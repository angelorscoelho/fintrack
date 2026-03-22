# Active Context

> Short-term memory. Update with UMB command at end of each session.
> Roo reads this at session start to resume without re-investigation.

## Current Focus
<!-- What is being worked on RIGHT NOW? -->
FinTrack deployment - Siemens approach (static files in portfolio) - Build in progress on Vercel

## Recent Changes
<!-- What was last changed, by which mode, and why? -->
- [2026-03-22] Code mode: Built frontend locally (npm ci && VITE_API_URL=... npm run build)
- [2026-03-22] Code mode: Copied static files to ../angelorscoelho.dev/dist/fintrack/
- [2026-03-22] Code mode: Fixed portfolio vercel.json with FinTrack rewrite rules
- [2026-03-22] Code mode: Fixed build:fintrack script to clone fintrack repo during Vercel build
- [2026-03-22] Code mode: Changed npm install --omit=dev to npm ci in build:fintrack
- [2026-03-22] Code mode: Pushed fixes to GitHub (commits e720406, 675115d, ad40df6)
- [2026-03-22] Code mode: Vercel build now working - clone + npm ci completing successfully

## Deployment Architecture (Siemens Approach)
- Clone fintrack repo during Vercel build to /tmp/fintrack
- Build FinTrack React frontend with base=/poc/fintrack/
- Copy built files to dist/fintrack/
- Rewrite /poc/fintrack/(.*) → /fintrack/index.html

## Deployment Status
| Component | Status | URL/Value |
|-----------|--------|-----------|
| AWS CloudFormation | ✅ Deployed | stack: fintrack-ai-poc |
| SSM Parameters | ✅ Configured | /fintrack/gemini_api_key |
| Railway fintrack-genai | ✅ Deployed | https://fintrack-genai.railway.app |
| Railway fintrack-api | ✅ Deployed | https://fintrack-api.railway.app |
| Lambda GENAI_SERVICE_URL | ✅ Updated | https://fintrack-genai.railway.app |
| Frontend Built | ✅ Done | frontend/dist/ with base=/poc/fintrack/ |
| Portfolio Rewrite Rules | ✅ Done | /poc/fintrack/(.*) → /fintrack/index.html |
| build:fintrack Script | ✅ Fixed | Clone + npm ci + copy to dist/fintrack/ |
| GitHub Push | ✅ Done | Commit e720406 |
| Vercel Build | ⏳ In Progress | build:fintrack running on Vercel |

## Next Steps (Continue on another session)
1. Check Vercel deployment status at https://vercel.com/angelo-coelhos-projects/angelorscoelho-dev
2. Wait for build completion (may take 2-3 minutes due to git clone + npm ci)
3. Verify FinTrack loads at https://angelorscoelho.dev/poc/fintrack/
4. Test end-to-end with sample transactions
5. Configure GitHub Actions CI/CD secrets
6. Run E2E smoke test: `make test-e2e`

## Known Issues
- Vercel build can take 2-3 minutes due to cloning repo and npm ci
- Build cache may need to be cleared if issues persist
- Current URL still shows portfolio (waiting for new deployment)
