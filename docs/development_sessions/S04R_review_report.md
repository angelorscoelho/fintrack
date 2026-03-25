# REVIEW REPORT — S04R — Isolation Forest

**Date:** 2026-03-18
**Reviewer Role:** ML Scientist / Peer Reviewer
**Input:** S04E output (`train_model.py`, `ml_scorer.py`, `model.pkl`, `training_report.json`)

---

## GLOBAL RESULT: APPROVED

---

## CHECKLIST

### Model Quality

| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | `data/training_report.json` exists | ✅ PASS | 443 bytes, valid JSON |
| 2 | `precision >= 0.70` | ✅ PASS | 0.858 (target: ≥ 0.70) |
| 3 | `recall >= 0.65` | ✅ PASS | 0.687 (target: ≥ 0.65) |
| 4 | `backend/lambda_layer/model.pkl` exists and < 50 MB | ✅ PASS | 2.82 MB (generated via `python data/train_model.py`; in `.gitignore` by design) |
| 5 | `pickle.load(model.pkl)` returns dict with expected keys | ✅ PASS | Keys: `categories`, `feature_names`, `label_encoder`, `model`, `norm_max`, `norm_min` |

### Training-Inference Consistency (CRITICAL)

Compared `data/train_model.py::build_feature_matrix()` (lines 32-58) vs `backend/lambda_handler/ml_scorer.py::_build_feature_vector()` (lines 47-76):

| # | Feature | train_model.py | ml_scorer.py | Result |
|---|---------|---------------|--------------|--------|
| 0 | amount_ratio | `amount / prev_avg.clip(lower=1.0)` (L48) | `amount / max(prev_avg, 1.0)` (L67) | ✅ IDENTICAL |
| 1 | velocity_score | `transactions_last_10min / 10.0` (L49) | `velocity / 10.0` (L68) | ✅ IDENTICAL |
| 2 | hour_sin | `np.sin(2 * np.pi * hour / 24)` (L50) | `math.sin(2 * math.pi * hour / 24)` (L69) | ✅ IDENTICAL (np.pi == math.pi verified) |
| 3 | hour_cos | `np.cos(2 * np.pi * hour / 24)` (L51) | `math.cos(2 * math.pi * hour / 24)` (L70) | ✅ IDENTICAL |
| 4 | day_norm | `day_of_week / 6.0` (L52) | `day / 6.0` (L71) | ✅ IDENTICAL |
| 5 | amount_log | `np.log1p(amount)` (L53) | `math.log1p(amount)` (L72) | ✅ IDENTICAL (verified numerically) |
| 6 | is_off_hours | `hour.between(0, 5).astype(int)` (L54) | `1.0 if 0 <= hour <= 5 else 0.0` (L73) | ✅ IDENTICAL (pd.between inclusive both ends) |
| 7 | is_foreign | `(country != "PT").astype(int)` (L55) | `0.0 if country == "PT" else 1.0` (L74) | ✅ IDENTICAL |
| 8 | category_enc | `le.transform(df["category"])` (L56) | `le.transform([category])[0]` (L64) | ✅ IDENTICAL (same LE from artifact) |
| — | Feature vector length | 9 (L47-57) | 9 (L66-76) | ✅ IDENTICAL |

**Additional consistency verifications performed:**
- `np.sin/cos/log1p` vs `math.sin/cos/log1p`: bit-exact match confirmed
- `pd.Series.between(0,5)` vs `0 <= x <= 5`: boundary match confirmed (hour=5 → 1, hour=6 → 0)
- CATEGORIES list: identical in train artifact and scorer (`['fuel', 'restaurant', 'travel', 'technology_services', 'medical', 'consulting', 'retail', 'utilities']`)
- LabelEncoder: all 8 categories produce identical ordinal values from artifact vs fresh-fit encoder
- Unseen category handling: both map to `CATEGORIES[0]` ("fuel") — consistent

### Score Normalization Consistency

| # | Check | train_model.py | ml_scorer.py | Result |
|---|-------|---------------|--------------|--------|
| 1 | `inverted = -raw_score` | L73: `inverted = -raw_scores` | L98: `inverted = -raw_score` | ✅ IDENTICAL |
| 2 | Clip to `[norm_min, norm_max]` | L76: `np.clip(inverted, p_low, p_high)` | L99: `max(norm_min, min(norm_max, inverted))` | ✅ IDENTICAL (verified numerically) |
| 3 | `(clipped - norm_min) / (norm_max - norm_min + 1e-9)` | L77 | L100 | ✅ IDENTICAL |
| 4 | `norm_min`/`norm_max` from artifact | Stored at L127-128, saved in artifact L158 | Loaded from artifact L91-92 | ✅ FROM ARTIFACT |

### Lambda Integration

| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | Tries `/opt/python/model.pkl` first | ✅ PASS | L20: first entry in `_MODEL_PATHS` |
| 2 | `_artifact_cache` module-level dict | ✅ PASS | L25: `_artifact_cache: dict[str, Any] = {}` |
| 3 | No model loading at module level | ✅ PASS | Lazy loading in `_load_artifact()` called by `score_transaction()` |
| 4 | Returns `float` rounded to 4 decimal places | ✅ PASS | L104: `return round(score, 4)` |

### Functional Test

```bash
python -c "from backend.lambda_handler.ml_scorer import score_transaction; print(score_transaction({'amount':5000,'previous_avg_amount':100,'transactions_last_10min':20,'hour_of_day':3,'day_of_week':1,'merchant_country':'CN','category':'consulting'}))"
```

**Result:** `1.0` (type: `float`) — **> 0.70** ✅ PASS

### Edge Cases Verified

| Test | Score | Status |
|------|-------|--------|
| Normal transaction (PT, restaurant, low amount) | 0.0 | ✅ Correctly low |
| Empty payload (all defaults) | 0.6763 | ✅ Below threshold |
| Unseen category ("UNKNOWN_CATEGORY") | 1.0 | ✅ Mapped to CATEGORIES[0], still flagged due to other signals |
| Zero `previous_avg_amount` | 0.8365 | ✅ No division by zero (clipped to 1.0) |
| Hour boundary (5 vs 6) | 1.0 / 0.0 | ✅ Correct is_off_hours encoding |

---

## ISSUES

**None.** All checklist items pass. No blockers, majors, or minors found.

**Note:** `model.pkl` is in `.gitignore` (along with `*.pkl`), which is correct for binary artifacts. Deployers must run `python data/generator.py && python data/train_model.py` to regenerate. The `training_report.json` IS committed, providing metrics traceability.

---

## CORRECTED FILES

None. No corrections needed.

---

## NOTES FOR S05E

- **model.pkl path for Lambda Layer**: `/opt/python/model.pkl` (confirmed in ml_scorer.py L20)
- **Anomaly score thresholds confirmed**: `< 0.70` → NORMAL, `0.70–0.90` → PENDING_REVIEW + Gemini Flash XAI, `> 0.90` → PENDING_REVIEW + Gemini Flash + Gemini Pro SAR
- **Score distribution**: 240/1000 above 0.70, 154/1000 above 0.90 — expect ~24% of transactions to trigger GenAI, ~15.4% to trigger SAR
- **Normalization bounds**: `norm_min=0.4189`, `norm_max=0.5640` (from p10/p90 of inverted raw scores)
- **Edge cases for LangGraph**: Empty payloads score 0.6763 (below threshold, no GenAI needed); zero `previous_avg_amount` handled gracefully (clipped to 1.0)
- **Rate limiter**: Still uses hardcoded defaults (500 Flash / 100 Pro) matching SSM params — functional for PoC
- **model.pkl not in git**: Must be regenerated before deployment (`python data/train_model.py`)
