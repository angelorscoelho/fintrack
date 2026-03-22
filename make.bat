@echo off
setlocal enabledelayedexpansion

if "%1"=="" (
    echo Usage: make ^<target^>
    echo Targets: secrets train deploy-infra test-e2e
    exit /b 1
)

if "%1"=="secrets" goto :secrets
if "%1"=="train" goto :train
if "%1"=="deploy-infra" goto :deploy-infra
if "%1"=="test-e2e" goto :test-e2e

echo Unknown target: %1
exit /b 1

:secrets
if "%GEMINI_API_KEY%"=="" (
    echo ERROR: GEMINI_API_KEY is not set.
    echo Run: set GEMINI_API_KEY=AIza... && make secrets
    exit /b 1
)
aws ssm put-parameter --name "/fintrack/gemini_api_key" --value "%GEMINI_API_KEY%" --type SecureString --region eu-west-1 --overwrite
aws ssm put-parameter --name "/fintrack/gemini_flash_daily_limit" --value "500" --type String --region eu-west-1 --overwrite
aws ssm put-parameter --name "/fintrack/gemini_pro_daily_limit" --value "100" --type String --region eu-west-1 --overwrite
echo SSM parameters configured successfully
goto :eof

:train
python data/train_model.py
goto :eof

:deploy-infra
call scripts\deploy.sh
goto :eof

:test-e2e
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name fintrack-ai-poc --region eu-west-1 --query "Stacks[0].Outputs[?OutputKey=='IngestEndpoint'].OutputValue" --output text 2^>nul') do set ENDPOINT=%%i
if "%ENDPOINT%"=="" (
    echo ERROR: Could not retrieve IngestEndpoint
    exit /b 1
)
python -c "import json, urllib.request, time; data = {'transaction_id': 'TEST-001', 'user_id': 'user123', 'amount': 9999.99, 'merchant': 'Test Store', 'category': 'electronics', 'lat': 38.7223, 'lon': -9.1393, 'hour': 3, 'day_of_week': 6}; req = urllib.request.Request('%ENDPOINT%', data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method='POST'); try: with urllib.request.urlopen(req, timeout=10) as resp: print('Ingestion OK:', resp.status); except Exception as e: print('Ingestion failed:', e)"
goto :eof