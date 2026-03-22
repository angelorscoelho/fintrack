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

## In Progress
- [ ] SSM Gemini API key not set — `make secrets` not run yet
- [ ] Railway services not deployed/verified
- [ ] Lambda GENAI_SERVICE_URL still points to localhost

## Backlog
- [ ] Railway: Deploy fintrack-api and fintrack-genai services
- [ ] Railway: Update Lambda GENAI_SERVICE_URL to Railway genai URL
- [ ] Vercel: Deploy frontend with VITE_API_URL, VITE_BASE_PATH=/poc/fintrack/
- [ ] Portfolio: Update vercel.json with FinTrack rewrites
- [ ] GitHub Actions: Configure secrets for CI/CD
- [ ] E2E smoke test: `make test-e2e`

## Known Issues / Tech Debt
<!-- Things that need fixing but aren't blocking current work. -->
- Lambda GENAI_SERVICE_URL = `http://localhost:8001` (wrong — should be Railway URL)
- SSM `/fintrack/gemini_api_key` missing (only rate limit params exist)
- deploy.sh deletes and recreates stack on every run (could be improved)
