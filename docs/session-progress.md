# Último estado conhecido do projeto FinTrack AI
Data da última revisão: 2026-03-18
Última sessão REVIEW concluída: S03R_DataGenerator_REVIEW

## Resumo da última revisão (apenas pontos importantes para o próximo executor)

- GLOBAL RESULT: APPROVED
- Alterações críticas aplicadas: não → nenhuma
- Ficheiros corrigidos / sobrescritos: nenhum
- Pontos de atenção / restrições para o próximo EXEC:
  • CSV path para treino: `data/synthetic_transactions.csv` (1000 rows, inclui `is_anomaly` e `anomaly_type`)
  • Label file: `data/anomaly_labels.json` (1000 entradas, `{transaction_id: bool}`)
  • Features de treino: `amount`, `category`, `merchant_country`, `previous_avg_amount`, `hour_of_day`, `day_of_week`, `transactions_last_10min` — NÃO usar `transaction_id`, `timestamp`, `merchant_nif`, `merchant_name`, `ip_address`
  • Anomaly ratio: 30% — IsolationForest `contamination` ≈ 0.30
  • CSV encoding: UTF-8 com BOM (`utf-8-sig`) — usar `encoding="utf-8-sig"` ao ler
  • Features categóricas (`category`, `merchant_country`) precisam de encoding (one-hot ou label)
  • Ficheiros gerados estão no `.gitignore` — correr `python data/generator.py` antes de treinar para regenerar
  • Seed 42 garante reprodutibilidade
  • ML scorer (`ml_scorer.py`) é placeholder — retorna 0.5 — deve ser substituído em S04E pelo modelo treinado
  • Rate limiter usa defaults hardcoded (500 Flash / 100 Pro) que coincidem com SSM — funcional mas não dinâmico
  • Lambda timeout = 30s, SQS VisibilityTimeout = 60s — não alterar esta relação
  • model.pkl deve ser colocado em `/opt/python/model.pkl` (Lambda Layer) conforme PRD
- Estado atual do repositório: pronto para S04E

Última confirmação de estrutura: S00 + S01E + S01R + S02E + S02R + S03E + S03R aplicados
