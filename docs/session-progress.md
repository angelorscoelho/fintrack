# Último estado conhecido do projeto FinTrack AI
Data da última revisão: 2026-03-18
Última sessão REVIEW concluída: S08R_SSE_Resolve_REVIEW

## Resumo da última revisão (apenas pontos importantes para o próximo executor)

- GLOBAL RESULT: APPROVED WITH FIXES
- Alterações críticas aplicadas: sim → 1 MAJOR fix aplicado (race condition no semáforo SSE)
- Ficheiros corrigidos / sobrescritos:
  - `backend/api/routes/stream.py` — semáforo agora adquirido no handler antes de criar o StreamingResponse (e libertado no finally do generator), eliminando race condition que permitia >3 conexões SSE simultâneas
- Pontos de atenção / restrições para o próximo EXEC:
  • API shapes confirmados para React — AlertResponse (15+ campos), StatsResponse (9 campos incluindo rate_limits dict)
  • SSE URL: `GET /api/alerts/stream` — envia `data: {JSON}\n\n` + `: heartbeat\n\n`
  • Resolve: `PUT /api/alerts/{id}/resolve` body: `{resolution_type, analyst_notes}`
  • Resolution types: CONFIRMED_FRAUD → RESOLVED, FALSE_POSITIVE → FALSE_POSITIVE, ESCALATED → RESOLVED
  • 503 no 4º SSE — frontend deve tratar gracefully (ex: sonner toast + retry)
  • Route order: stream.router registado ANTES de alerts.router para evitar conflito com `{transaction_id}`
  • `config.py` existe mas NÃO é usado — `dynamo.py` usa `os.environ` diretamente
  • `processing_status` NÃO está em AlertResponse — adicionar se UI precisar
  • `model.pkl` NÃO está no git — correr `python data/generator.py && python data/train_model.py` para regenerar
  • CORS: localhost:3000 e localhost:5173 apenas
  • X-Request-ID middleware ativo em todas as respostas
  • Todas as rotas registadas em main.py: health, alerts, alerts/{id}, stats, alerts/{id}/resolve, alerts/stream
  • Swagger /docs carrega sem erros com todas as 5 route files
- Estado atual do repositório: pronto para S09E

Última confirmação de estrutura: S00 + S01E + S01R + S02E + S02R + S03E + S03R + S04E + S04R + S05E + S05R + S06E + S06R + S07E + S07R + S08E + S08R aplicados
