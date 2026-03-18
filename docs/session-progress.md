# Último estado conhecido do projeto FinTrack AI
Data da última revisão: 2026-03-18
Última sessão REVIEW concluída: S05R_LangGraph_Flash_REVIEW

## Resumo da última revisão (apenas pontos importantes para o próximo executor)

- GLOBAL RESULT: APPROVED WITH FIXES
- Alterações críticas aplicadas: sim → adicionado tenacity retry 3× para Gemini Flash, corrigido error_message não persistido no DynamoDB, system_instruction separado do user prompt, assert substituído por if/raise ValueError
- Ficheiros corrigidos / sobrescritos:
  - `backend/genai/graph.py` — adicionado `error_message` ao UpdateExpression do DynamoDB
  - `backend/genai/nodes/flash_xai.py` — adicionado `_call_flash()` com @retry tenacity (3 tentativas, exponential backoff), movido system prompt para `system_instruction`, substituído `assert` por `if/raise ValueError`
  - `backend/genai/requirements.txt` — adicionado `tenacity>=8.2.0`
- Pontos de atenção / restrições para o próximo EXEC:
  • Graph atual: `analyse_basic` → `END` (edge simples, sem conditional routing)
  • S06E deve substituir `graph.add_edge("analyse_basic", END)` por conditional edge baseado em `anomaly_score > 0.90`
  • Verificar que `processing_status != "error"` antes de enviar para `audit_deep` (não fazer SAR se Flash falhou)
  • State fields disponíveis: `transaction_id`, `anomaly_score`, `payload`, `ai_explanation` (JSON string), `sar_draft` (None), `processing_status`, `error_message`
  • `processing_status` flow: `pending` → `xai_complete` → `sar_complete` | `error`
  • `error_message` agora é persistido no DynamoDB — S06E pode usar o mesmo padrão para erros do Pro
  • Tenacity retry já configurado para Flash; S06E deve adicionar retry equivalente para Gemini Pro
  • `pro_sar.py` placeholder existe com `audit_deep()` pronto para implementação
  • Rate limiter (DynamoDB atomic counter) deve ser chamado ANTES dos API calls do Gemini
  • Gemini Pro: `gemini-1.5-pro-latest`, temperatura mais baixa (~0.05) para SAR drafts
  • SSM params: `/fintrack/gemini_flash_daily_limit` (500), `/fintrack/gemini_pro_daily_limit` (100)
  • `model.pkl` NÃO está no git — correr `python data/generator.py && python data/train_model.py` para regenerar
  • Lambda timeout = 30s, SQS VisibilityTimeout = 60s — não alterar esta relação
- Estado atual do repositório: pronto para S06E

Última confirmação de estrutura: S00 + S01E + S01R + S02E + S02R + S03E + S03R + S04E + S04R + S05E + S05R aplicados
