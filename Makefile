.PHONY: secrets train test-e2e deploy-infra

# Set your Gemini API key before running: export GEMINI_API_KEY=AIza...
# Or on Windows CMD: set GEMINI_API_KEY=AIza... && make secrets

secrets:
ifndef GEMINI_API_KEY
	$(error GEMINI_API_KEY is not set. Run: export GEMINI_API_KEY=AIza... && make secrets)
endif
	aws ssm put-parameter --name "/fintrack/gemini_api_key" --value "$(GEMINI_API_KEY)" --type SecureString --region eu-west-1 --overwrite
	aws ssm put-parameter --name "/fintrack/gemini_flash_daily_limit" --value "500" --type String --region eu-west-1 --overwrite
	aws ssm put-parameter --name "/fintrack/gemini_pro_daily_limit" --value "100" --type String --region eu-west-1 --overwrite
	@echo "SSM parameters configured successfully"

train:
	python data/train_model.py

deploy-infra:
	./scripts/deploy.sh

test-e2e:
	@export ENDPOINT=$$(aws cloudformation describe-stacks --stack-name fintrack-ai-poc --region eu-west-1 --query "Stacks[0].Outputs[?OutputKey=='IngestEndpoint'].OutputValue" --output text 2>/dev/null) && \
	python -c "
import json, urllib.request, time
data = {'transaction_id': 'TEST-001', 'user_id': 'user123', 'amount': 9999.99, 'merchant': 'Test Store', 'category': 'electronics', 'lat': 38.7223, 'lon': -9.1393, 'hour': 3, 'day_of_week': 6}
req = urllib.request.Request(ENDPOINT, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print('Ingestion OK:', resp.status)
except Exception as e:
    print('Ingestion failed:', e)
"
