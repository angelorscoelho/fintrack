# Último estado conhecido do projeto FinTrack AI
Data da última revisão: 2026-03-18
Última sessão REVIEW concluída: S06R_GeminiPro_SAR_REVIEW

## Resumo da última revisão (apenas pontos importantes para o próximo executor)

- GLOBAL RESULT: APPROVED WITH FIXES
- Alterações críticas aplicadas: sim → adicionado tenacity retry 3× para Gemini Pro via `_call_pro()` (BLOCKER corrigido)
- Ficheiros corrigidos / sobrescritos:
  - `backend/genai/nodes/pro_sar.py` — adicionado `_call_pro()` com @retry tenacity (3 tentativas, exponential backoff 2-10s), imports de `google.api_core.exceptions` e `tenacity`, chamada direta a `_pro_model.generate_content()` substituída por `_call_pro(prompt)`
  - `backend/genai/graph.py` — atualizado comentário de `TransactionState.processing_status` para incluir `sar_error`
- Pontos de atenção / restrições para o próximo EXEC:
  • GenAI microservice confirmado na porta 8001 (`backend/genai/main.py`)
  • DynamoDB fields: `ai_explanation` (JSON string), `sar_draft` (Markdown string) — ambos nullable
  • `processing_status` valores válidos: `pending`, `xai_complete`, `sar_complete`, `sar_error`, `error`
  • LangGraph flow completo: `analyse_basic` → conditional edge (`_route_by_risk`) → `audit_deep` (se score > 0.90 e sem erro) → `END`
  • Tenacity retry consistente em Flash e Pro (3 tentativas, exponential backoff 2-10s)
  • Rate limiter (DynamoDB atomic counter) NÃO está integrado nos nós genai — deve ser adicionado na sessão apropriada
  • SSM params: `/fintrack/gemini_flash_daily_limit` (500), `/fintrack/gemini_pro_daily_limit` (100)
  • `model.pkl` NÃO está no git — correr `python data/generator.py && python data/train_model.py` para regenerar
  • Lambda timeout = 30s, SQS VisibilityTimeout = 60s — não alterar esta relação
  • FastAPI API (porta 8000) deve tratar `sar_draft` como `Optional[str]` nos endpoints
  • CORS: localhost:3000 e localhost:5173 apenas
- Estado atual do repositório: pronto para S07E

Última confirmação de estrutura: S00 + S01E + S01R + S02E + S02R + S03E + S03R + S04E + S04R + S05E + S05R + S06E + S06R aplicados
