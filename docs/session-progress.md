# Último estado conhecido do projeto FinTrack AI
Data da última revisão: 2026-03-18
Última sessão REVIEW concluída: S07R_FastAPI_Review

## Resumo da última revisão (apenas pontos importantes para o próximo executor)

- GLOBAL RESULT: APPROVED WITH FIXES
- Alterações críticas aplicadas: sim → 4 MAJOR fixes aplicados (ver abaixo)
- Ficheiros corrigidos / sobrescritos:
  - `backend/api/models.py` — adicionado `RATE_LIMITED = "rate_limited"` ao enum `AlertStatus`; adicionado campo `rate_limited: int` ao `StatsResponse`
  - `backend/api/db/dynamo.py` — `get_alerts_by_status()` reescrito com contagem total correta (GSI COUNT query separado) e paginação completa de scan (LastEvaluatedKey); `get_stats()` reescrito com paginação de scan e contador `rate_limited`
- Pontos de atenção / restrições para o próximo EXEC:
  • FastAPI API confirmada na porta 8000 (`backend/api/main.py`), lifespan init DynamoDB, CORS configurado
  • Endpoints ativos: `GET /health`, `GET /api/alerts`, `GET /api/alerts/{id}`, `GET /api/stats`
  • Endpoints S08E (placeholders existem, NÃO registados em routers): `PUT /api/alerts/{id}/resolve` (resolve.py), `GET /api/alerts/stream` (stream.py)
  • S08E precisa criar função `update_alert()` em `db/dynamo.py` para o resolve endpoint — usar UpdateItem com ConditionExpression
  • SSE: usar `sse-starlette` (já em requirements.txt) + `asyncio.Semaphore(3)` — polling 5s recomendado
  • `AlertStatus` inclui agora: NORMAL, PENDING_REVIEW, RESOLVED, FALSE_POSITIVE, rate_limited
  • `StatsResponse` inclui agora: total, pending, critical, resolved, false_positives, rate_limited, fp_rate, avg_score
  • `_deserialize_item()` converte `ai_explanation` de JSON string para dict automaticamente
  • `@field_validator` em AlertResponse converte Decimal → float para anomaly_score, amount, previous_avg_amount
  • `config.py` existe com `Settings` class (pydantic-settings) mas não é usado — `dynamo.py` usa `os.environ` diretamente
  • `processing_status` NÃO está em AlertResponse — considerar adicionar se UI precisar
  • `model.pkl` NÃO está no git — correr `python data/generator.py && python data/train_model.py` para regenerar
  • CORS: localhost:3000 e localhost:5173 apenas
  • X-Request-ID middleware ativo em todas as respostas
- Estado atual do repositório: pronto para S08E

Última confirmação de estrutura: S00 + S01E + S01R + S02E + S02R + S03E + S03R + S04E + S04R + S05E + S05R + S06E + S06R + S07E + S07R aplicados
