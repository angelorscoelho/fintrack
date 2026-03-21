#!/usr/bin/env bash
# deploy.sh - FinTrack AI SAM + Lambda Container Image
set -euo pipefail

STACK_NAME="fintrack-ai-poc"
ECR_REPO_NAME="fintrack-lambda"
REGION="eu-west-1"
TEMPLATE_DIR="infra"
TEMPLATE_BASENAME="template.yaml"
TEMPLATE_FILE="$TEMPLATE_DIR/$TEMPLATE_BASENAME"
MAX_RETRIES=3
RETRY_DELAY=5

echo "[deploy] Region: $REGION | Stack: $STACK_NAME | ECR: $ECR_REPO_NAME"

fail() { echo "[ERROR] $*" >&2; exit 1; }

# Capture original directory so we can return at the end
ORIG_PWD="$(pwd)"

# Get AWS account ID (strip any CRs) and fail if empty
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --region "$REGION" 2>/dev/null | tr -d '\r')"
if [ -z "${ACCOUNT_ID:-}" ]; then
  fail "Cannot get Account ID"
fi

# ECR registry and repository URI
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
REPO_URI="${ECR_REGISTRY}/${ECR_REPO_NAME}"

# Delete stack if exists — use AWS CLI directly (waits for completion) rather than
# sam delete, so the stack is fully gone before sam deploy runs.
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "[deploy] Deleting stack..."
  aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION" 2>/dev/null || true
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION" 2>/dev/null || true
  echo "[deploy] Stack deleted."
fi

# Create ECR if missing
if ! aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "[deploy] Creating ECR repo..."
  aws ecr create-repository --repository-name "$ECR_REPO_NAME" --region "$REGION" >/dev/null || fail "ECR create failed"
fi

# ECR login
echo "[deploy] ECR login..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY" || fail "Login failed"

# Build & push local image (keeps original behaviour)
echo "[deploy] Building/pushing image..."
pushd backend/lambda_handler >/dev/null
DOCKER_BUILDKIT=0 docker build --platform linux/amd64 -t "${REPO_URI}:latest" . || fail "Build failed"
for i in $(seq 1 $MAX_RETRIES); do
  docker push "${REPO_URI}:latest" && break
  echo "[deploy] Push failed (attempt $i) — retrying..."
  sleep $RETRY_DELAY
done || fail "Push failed after retries"
popd >/dev/null

# Move into infra so SAM resolves relative DockerContext correctly
echo "[deploy] Entering $TEMPLATE_DIR for SAM operations..."
pushd "$TEMPLATE_DIR" >/dev/null || fail "Cannot cd into $TEMPLATE_DIR"

# Ensure we cleanup and return to original directory
cleanup() {
  popd >/dev/null 2>&1 || true
  cd "$ORIG_PWD" 2>/dev/null || true
}
trap cleanup EXIT

echo "[deploy] SAM build... (debug + explicit build-dir)"
# Run sam build from infra/ so DockerContext paths in template are relative to infra/
sam build --template-file "$TEMPLATE_BASENAME" --debug --build-dir .aws-sam/build --region "$REGION" || fail "sam build failed"

# Delete any SAM companion stacks stuck in ROLLBACK_COMPLETE
echo "[deploy] Checking for stuck SAM companion stacks..."
COMPANION_STACKS=$(aws cloudformation list-stacks \
  --region "$REGION" \
  --stack-status-filter ROLLBACK_COMPLETE \
  --query "StackSummaries[?starts_with(StackName, '${STACK_NAME}-') && ends_with(StackName, '-CompanionStack')].StackName" \
  --output text 2>/dev/null || true)
for cs in $COMPANION_STACKS; do
  echo "[deploy] Deleting stuck companion stack: $cs"
  aws cloudformation delete-stack --stack-name "$cs" --region "$REGION"
  aws cloudformation wait stack-delete-complete --stack-name "$cs" --region "$REGION"
  echo "[deploy] Deleted: $cs"
done

echo "[deploy] SAM deploy..."
for i in $(seq 1 $MAX_RETRIES); do
  sam deploy \
    --template-file "$TEMPLATE_BASENAME" \
    --stack-name "$STACK_NAME" \
    --resolve-image-repos \
    --region "$REGION" \
    --disable-rollback \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM && break
  echo "[deploy] Deploy failed (attempt $i) — retrying..."
  sleep $RETRY_DELAY
done || fail "Deploy failed after retries"

# Return to original directory before querying CloudFormation
cleanup

# Get URL (OutputKey in the template: IngestEndpoint)
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='IngestEndpoint'].OutputValue" \
  --output text 2>/dev/null || echo "Check CloudFormation outputs manually")

echo "[deploy] Done! API URL: ${API_URL:-Not found — verify in AWS Console}"