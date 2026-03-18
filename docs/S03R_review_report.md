# REVIEW REPORT — S03R — Data Generator

**Date:** 2026-03-18
**Reviewer:** ML Data Engineer (Copilot Agent)
**Input:** S03E output (`data/generator.py` + generated datasets)
**Output goes to:** S04E Executor

---

## GLOBAL RESULT: APPROVED

---

## CHECKLIST

| # | Check | Result |
|---|-------|--------|
| 1 | Script runs without errors: `python data/generator.py` | ✅ PASS |
| 2 | `synthetic_transactions.csv`: 1000 rows, correct headers | ✅ PASS — 1000 data rows + 1 header, 14 columns as expected |
| 3 | `synthetic_transactions.json`: 1000 objects, NO `is_anomaly`, NO `anomaly_type` | ✅ PASS — 1000 objects, neither field present |
| 4 | `anomaly_labels.json`: 1000 keys, values are booleans | ✅ PASS — 1000 keys, all values `true`/`false` |
| 5 | Anomaly rate: 28–32% | ✅ PASS — Exactly 30.0% (300/1000) |
| 6 | All 4 anomaly_type values present in CSV | ✅ PASS — `amount_spike`, `geo_hopping`, `invoice_manipulation`, `velocity_fraud` |
| 7 | `transaction_id` uniqueness: no duplicates | ✅ PASS — 1000 unique UUIDs (v4 format verified) |
| 8 | `amount` > 0 for all records | ✅ PASS — min=1.0, max=50000.0 |
| 9 | `merchant_nif` matches regex `^PT[0-9]{9}$` for all records | ✅ PASS — 1000/1000 valid |
| 10 | `hour_of_day` in [0, 23] for all records | ✅ PASS — min=0, max=23 |
| 11 | `day_of_week` in [0, 6] for all records | ✅ PASS — min=0, max=6 |
| 12 | `transactions_last_10min` >= 0 for all records | ✅ PASS — min=0 |
| 13 | velocity_fraud records: `transactions_last_10min` > 15 for all of them | ✅ PASS — 80 records, min=16 |
| 14 | amount_spike records: `amount` > `previous_avg_amount * 4` for all of them | ✅ PASS — 80 records, min ratio=5.04x |
| 15 | geo_hopping records: `merchant_country` != "PT" for all of them | ✅ PASS — 70 records, all foreign |
| 16 | invoice_manipulation records: `category` = "consulting" AND `amount` multiple of 1000 | ✅ PASS — 70 records, all consulting, amounts from {9000, 10000, 15000, 20000, 25000, 30000, 50000} |

---

## ADDITIONAL ADVERSARIAL CHECKS

| Check | Result |
|-------|--------|
| Labels ↔ CSV consistency (anomaly_labels.json matches CSV is_anomaly) | ✅ PASS — 0 mismatches |
| JSON webhook fields match PRD spec (12 fields, no extras) | ✅ PASS |
| JSON excludes Lambda-assigned fields (status, anomaly_score, ttl, processed_at) | ✅ PASS |
| JSON data types (amount=float, hour_of_day=int, day_of_week=int) | ✅ PASS |
| UUID v4 format compliance | ✅ PASS — 1000/1000 valid UUIDs |
| ISO 8601 timestamp format | ✅ PASS — all parseable, UTC timezone |
| Reproducibility (seed 42) | ✅ PASS — deterministic output |

---

## ISSUES

**None found.** The data generator is clean, well-structured, and produces correct output.

---

## NOTES FOR S04E

- **CSV path for training:** `data/synthetic_transactions.csv` (1000 rows, includes `is_anomaly` and `anomaly_type` columns)
- **Label file path:** `data/anomaly_labels.json` (1000 entries, `{transaction_id: bool}`)
- **Training features:** Use columns `amount`, `category`, `merchant_country`, `previous_avg_amount`, `hour_of_day`, `day_of_week`, `transactions_last_10min` — do NOT use `transaction_id`, `timestamp`, `merchant_nif`, `merchant_name`, `ip_address` as features
- **Target variable:** `is_anomaly` column in CSV or `anomaly_labels.json`
- **Anomaly ratio:** 30% — IsolationForest `contamination` parameter should be set to ~0.30
- **CSV encoding:** UTF-8 with BOM (`utf-8-sig`) — use `encoding="utf-8-sig"` when reading
- **Category encoding:** Will need one-hot or label encoding for `category` and `merchant_country` (categorical features)
- **Generated files are gitignored:** Run `python data/generator.py` before training to regenerate
- **Data types in JSON:** `amount` and `previous_avg_amount` are floats; `hour_of_day`, `day_of_week`, `transactions_last_10min` are ints — matches DynamoDB Number type
