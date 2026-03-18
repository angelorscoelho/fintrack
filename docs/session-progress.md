# Último estado conhecido do projeto FinTrack AI
Data da última revisão: 2026-03-18
Última sessão REVIEW concluída: S02R_DynamoDB_Lambda_REVIEW

## Resumo da última revisão (apenas pontos importantes para o próximo executor)

- GLOBAL RESULT: APPROVED WITH FIXES
- Alterações críticas aplicadas: sim → removida permissão extra `ssm:GetParameters` do IAM; nome do role Lambda parametrizado com `${Environment}`
- Ficheiros corrigidos / sobrescritos: infra/template.yaml (2 alterações menores no LambdaExecutionRole)
- Pontos de atenção / restrições para o próximo EXEC:
  • Tabela DynamoDB chama-se exatamente `transactions` — PK: `transaction_id` (String, UUID v4)
  • GSI: `status-timestamp-index` (PK: status, SK: timestamp, Projection: ALL)
  • ML scorer (`ml_scorer.py`) é placeholder — retorna 0.5 — todas as transações são NORMAL até S04E
  • Rate limiter usa defaults hardcoded (500 Flash / 100 Pro) que coincidem com SSM — funcional mas não dinâmico
  • GenAI service URL é `http://localhost:8001` — serviço GenAI deve estar a correr localmente para XAI/SAR
  • Lambda timeout = 30s, SQS VisibilityTimeout = 60s — não alterar esta relação
  • Ingestão: POST /ingest → API Gateway → SQS → Lambda — gerador deve enviar JSON para o endpoint
  • O gerador NÃO deve definir `status`, `anomaly_score`, `ttl`, `processed_at` — estes são definidos pelo Lambda
  • Campos obrigatórios do payload: transaction_id, timestamp, merchant_nif, merchant_name, amount, category, ip_address, merchant_country, previous_avg_amount, hour_of_day, day_of_week, transactions_last_10min
  • CORS: apenas localhost:3000 e localhost:5173
  • Outputs exportados: FinTrackIngestEndpoint-${Environment}, FinTrackSQSQueueUrl-${Environment}, FinTrackSQSQueueArn-${Environment}, FinTrackDLQUrl-${Environment}, FinTrackHttpApiId-${Environment}, FinTrackDynamoDBTable-${Environment}, FinTrackRateLimiterTable-${Environment}, FinTrackLambdaArn-${Environment}
- Estado atual do repositório: pronto para S03E

Última confirmação de estrutura: S00 + S01E + S01R + S02E + S02R aplicados
