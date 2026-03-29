# Progress

> Track what's done and what's left. Update with UMB.

## Completed
- [x] AWS CloudFormation stack `fintrack-ai-poc` deployed (CREATE_COMPLETE as of 2026-03-21T15:43)
- [x] ECR repository `fintrack-lambda` created with Docker images pushed
- [x] Lambda function `fintrack-transaction-processor` deployed (Container Image)
- [x] DynamoDB tables created: `transactions`, `gemini_rate_limiter`
- [x] SQS queues created: `fintrack-transactions-queue-dev`, `fintrack-transactions-dlq-dev`
- [x] API Gateway endpoint: `https://401mgspqf4.execute-api.eu-west-1.amazonaws.com/dev/ingest`
- [x] ML model.pkl trained and exists locally (1.6MB)
- [x] IAM users created: fintrack-deploy (for deployment), fintrack-runtime (for Railway)
- [x] SSM Parameters configured with Gemini API key
- [x] Railway fintrack-api deployed
- [x] Railway fintrack-genai deployed
- [x] Lambda GENAI_SERVICE_URL updated to https://fintrack-genai.railway.app
- [x] Frontend built with base=/poc/fintrack/ (Siemens approach)
- [x] angelorscoelho.dev vercel.json updated with /poc/fintrack/ rewrite
- [x] angelorscoelho.dev package.json updated with build:fintrack script
- [x] **Dashboard — Hourly volume chart (on `main`):** stacked tiers, last 24h, tier chips, custom tooltip; fraud-rate line removed.
- [x] **Dashboard — Card 9 (`LiveAlertFeed`, branch `feat/us-017-us-018-high-risk-card`):** US-017 filtering, US-018 sorting, tier chips, modal VIEW, i18n — **pending git commit**.

## In Progress
- [ ] Commit + push `feat/us-017-us-018-high-risk-card` (Card 9 + i18n)
- [ ] Copy frontend/dist/* to ../angelorscoelho.dev/dist/fintrack/ (if still using Siemens deploy path)
- [ ] Deploy portfolio: cd ../angelorscoelho.dev && vercel --prod (if applicable)

## Backlog
- [ ] GitHub Actions: Configure secrets for CI/CD
- [ ] E2E smoke test: `make test-e2e`

## Known Issues / Tech Debt
- deploy.sh deletes and recreates stack on every run (could be improved)
