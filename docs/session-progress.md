# Último estado conhecido do projeto FinTrack AI
Data da última revisão: 2026-03-18
Última sessão REVIEW concluída: S04R_IsolationForest_REVIEW

## Resumo da última revisão (apenas pontos importantes para o próximo executor)

- GLOBAL RESULT: APPROVED
- Alterações críticas aplicadas: não → nenhuma
- Ficheiros corrigidos / sobrescritos: nenhum
- Pontos de atenção / restrições para o próximo EXEC:
  • `model.pkl` NÃO está no git (`.gitignore`) — correr `python data/generator.py && python data/train_model.py` para regenerar antes de qualquer teste ou deploy
  • Model path em Lambda: `/opt/python/model.pkl` (confirmado em `ml_scorer.py` L20)
  • Thresholds confirmados: `< 0.70` → NORMAL, `0.70–0.90` → PENDING_REVIEW + Gemini Flash XAI, `> 0.90` → PENDING_REVIEW + Gemini Flash + Gemini Pro SAR
  • Score distribution: 240/1000 acima de 0.70 (24%), 154/1000 acima de 0.90 (15.4%) — ~24% das transações disparam GenAI
  • Normalization bounds: `norm_min=0.4189`, `norm_max=0.5640` (p10/p90 de inverted raw scores, armazenados no artifact)
  • Feature engineering 100% consistente entre `train_model.py` e `ml_scorer.py` (9 features, verificado linha a linha)
  • Unseen categories mapeadas para `CATEGORIES[0]` ("fuel") em ambos os ficheiros
  • `previous_avg_amount = 0` tratado com `clip(lower=1.0)` / `max(..., 1.0)` — sem divisão por zero
  • Rate limiter usa defaults hardcoded (500 Flash / 100 Pro) que coincidem com SSM — funcional mas não dinâmico
  • Lambda timeout = 30s, SQS VisibilityTimeout = 60s — não alterar esta relação
  • Precision: 0.858, Recall: 0.687, F1: 0.763 — métricas acima dos mínimos exigidos
- Estado atual do repositório: pronto para S05E

Última confirmação de estrutura: S00 + S01E + S01R + S02E + S02R + S03E + S03R + S04E + S04R aplicados
