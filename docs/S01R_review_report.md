═══════════════════════════════════════════════════
REVIEW REPORT — S01R — AWS Ingestion Layer
Date: 2026-03-18  |  Reviewer: Cloud Security Engineer
═══════════════════════════════════════════════════

GLOBAL RESULT: APPROVED

───────────────────────────────────────────────────
CHECKLIST RESULTS
───────────────────────────────────────────────────

### Structural Correctness
- [PASS] `sam validate --lint` passes without warnings or errors
- [PASS] `AWSTemplateFormatVersion: '2010-09-09'` present (line 1)
- [PASS] `Transform: AWS::Serverless-2016-10-31` present (line 2)
- [PASS] No syntax errors in YAML indentation — both `sam validate --lint` and `cfn-lint` pass cleanly

### SQS Configuration
- [PASS] DLQ exists as separate resource `TransactionsDLQ` (line 20)
- [PASS] DLQ `MessageRetentionPeriod` = 1209600 (14 days) (line 24)
- [PASS] Main queue has `RedrivePolicy` pointing to DLQ with `maxReceiveCount: 3` (lines 39-41)
- [PASS] `VisibilityTimeout: 60` — correctly ≥ Globals.Function.Timeout of 30 (line 36)
- [PASS] `ReceiveMessageWaitTimeSeconds: 20` — long polling enabled (line 38)

### API Gateway
- [PASS] Uses `AWS::ApiGatewayV2::Api` with `ProtocolType: HTTP` (lines 70-73)
- [PASS] Stage `AutoDeploy: true` (line 91)
- [PASS] Integration type is `AWS_PROXY` with subtype `SQS-SendMessage` (lines 101-102)
- [PASS] Route is `POST /ingest` (line 113)
- [PASS] No Lambda proxy integration — correct for S01E scope

### IAM Security (Critical)
- [PASS] `ApiGatewayToSQSRole` exists as dedicated IAM Role (line 47)
- [PASS] Role `AssumeRolePolicyDocument` trusts `apigateway.amazonaws.com` ONLY (lines 55-57)
- [PASS] Role policy has ONLY `sqs:SendMessage` — nothing else (lines 64-66)
- [PASS] Role is NOT `AdministratorAccess` or `PowerUserAccess`
- [PASS] No `*` wildcards in Action or Resource — Resource scoped to `!GetAtt TransactionsQueue.Arn`

### CORS
- [PASS] `AllowOrigins` contains ONLY `http://localhost:3000` and `http://localhost:5173` (lines 75-77)
- [PASS] No wildcard `*` in AllowOrigins
- [PASS] `AllowMethods` contains POST and OPTIONS only (lines 78-80)

### Outputs
- [PASS] `IngestEndpoint` output with Export name `FinTrackIngestEndpoint-${Environment}` (lines 121-125)
- [PASS] `SQSQueueUrl` output with Export name `FinTrackSQSQueueUrl-${Environment}` (lines 127-130)
- [PASS] `SQSQueueArn` output with Export name `FinTrackSQSQueueArn-${Environment}` (lines 132-136)
- [PASS] `DLQUrl` output with Export name `FinTrackDLQUrl-${Environment}` (lines 139-143)

### Scope Compliance (vs PRD Compact)
- [PASS] NO Lambda function resources in this template (only placeholder comments at lines 116-118)
- [PASS] NO DynamoDB table in this template (only placeholder comment)
- [PASS] `samconfig.toml` has `region = "eu-west-1"` (line 5)
- [PASS] `samconfig.toml` has `CAPABILITY_NAMED_IAM` in capabilities (line 7)

───────────────────────────────────────────────────
ISSUES FOUND
───────────────────────────────────────────────────

No BLOCKER or MAJOR issues found.

[MINOR-1] Premature Globals.Function section
  File: infra/template.yaml, lines 5-9
  Observation: The `Globals.Function` block defines Runtime (python3.11),
  Timeout (30), and MemorySize (512) for Lambda functions that do not yet
  exist in this template (Lambda is S02E scope). SAM ignores Globals for
  resource types not present, so this is harmless and forward-looking.
  Action: No change required — will be consumed by S02E Lambda resources.

[MINOR-2] Extra HttpApiId output (bonus, not a violation)
  File: infra/template.yaml, lines 145-149
  Observation: The `HttpApiId` output is not listed in the review checklist
  required outputs, but it exports the API Gateway ID which will be useful
  for S02E cross-stack references. This is additive, not a violation.
  Action: No change required — beneficial for S02E.

───────────────────────────────────────────────────
CORRECTED TEMPLATE
───────────────────────────────────────────────────

Not applicable — template is APPROVED without modifications.

───────────────────────────────────────────────────
NOTES FOR S02E EXECUTOR
───────────────────────────────────────────────────

1. The ingestion layer is fully functional: API Gateway HTTP API → SQS integration
   is configured and ready to receive POST /ingest requests.

2. Exported values available for S02E cross-stack references:
   - `FinTrackIngestEndpoint-${Environment}` — Full POST endpoint URL
   - `FinTrackSQSQueueUrl-${Environment}` — SQS queue URL (for Lambda event source)
   - `FinTrackSQSQueueArn-${Environment}` — SQS queue ARN (for Lambda IAM policy)
   - `FinTrackDLQUrl-${Environment}` — DLQ URL (for monitoring)
   - `FinTrackHttpApiId-${Environment}` — API Gateway HTTP API ID

3. Constraints introduced by this template:
   - SQS VisibilityTimeout is 60 seconds — Lambda timeout in S02E MUST NOT exceed 60s
     (or VisibilityTimeout must be increased to match)
   - Globals.Function.Timeout is set to 30s — ensure Lambda timeout stays ≤ 60s
   - CORS only allows localhost:3000 and localhost:5173 — no production origins yet
   - API Gateway stage is hardcoded to `prod` (StageName) — URL path will include `/prod/`
   - DLQ maxReceiveCount is 3 — messages failing 3 times go to DLQ

4. When adding Lambda in S02E:
   - Use `!ImportValue FinTrackSQSQueueArn-${Environment}` for the event source mapping
   - Lambda IAM role needs `sqs:ReceiveMessage`, `sqs:DeleteMessage`,
     `sqs:GetQueueAttributes` on the TransactionsQueue ARN
   - Lambda also needs DynamoDB write permissions for the TransactionsTable

═══════════════════════════════════════════════════
