# FinTrack AI — Synthetic Data

## Overview

This directory contains synthetic transaction data used for ML training, validation,
and dashboard development. All generators produce **realistic fraud distributions**
matching industry benchmarks (Visa/Mastercard digital fraud rate: 0.1–0.5 %).

## Files

| File | Purpose |
|------|---------|
| `generator.py` | Generates labelled transactions for ML training (CSV + JSON) |
| `train_model.py` | Trains IsolationForest anomaly detection model |
| `populate_dynamodb.py` | Batch-loads synthetic data into DynamoDB |
| `training_report.json` | Model evaluation metrics from last training run |
| `requirements.txt` | Python dependencies for data scripts |

## Data Distribution

### Anomaly Rate: ≈ 2 % (PoC) — Real-world: 0.1–0.5 %

The PoC uses a slightly elevated rate (2 %) so the ML model has sufficient positive
samples for training. The frontend mock data (`frontend/src/lib/mockData.js`)
mirrors this distribution.

### Frontend Mock Dataset (80 transactions)

| Category | Count | % of Total | Score Range |
|----------|------:|----------:|-------------|
| NORMAL | 64 | 80.0 % | 0.001–0.35 (lognormal, median ≈ 0.01) |
| PENDING_REVIEW (high) | 8 | 10.0 % | 0.70–0.90 |
| PENDING_REVIEW (critical) | 4 | 5.0 % | 0.90–0.995 |
| CONFIRMED_FRAUD (resolved) | 2 | 2.5 % | 0.82–0.97 |
| FALSE_POSITIVE (resolved) | 2 | 2.5 % | 0.70–0.82 |

**Key Metrics:**

- **Average Score:** 10–18 % (target)
- **Fraud Rate:** 1.5–3.5 % (CONFIRMED_FRAUD / total)
- **Score Distribution:** Lognormal for normal transactions (not uniform)

### Training Dataset (`generator.py`, default 1 000 transactions)

| Anomaly Type | Rate |
|--------------|-----:|
| `velocity_fraud` | 0.5 % |
| `amount_spike` | 0.5 % |
| `geo_hopping` | 0.5 % |
| `invoice_manipulation` | 0.5 % |
| **Total anomaly** | **2.0 %** |
| Normal | 98.0 % |

## Score Distribution

Normal (non-anomalous) transactions use a **lognormal** score distribution:

- **μ = −4.5, σ = 0.7** (frontend mock data)
- Median score ≈ 0.011 (1.1 %)
- Mean score ≈ 0.014 (1.4 %)
- 90th percentile ≈ 0.026 (2.6 %)
- Max clipped at 0.35

This produces the characteristic right-skewed distribution seen in real fraud
detection systems, where the vast majority of transactions have very low risk
scores and only a small tail reaches the flagging thresholds (≥ 0.70).

## Usage

```bash
# Generate training data (default: 1000 transactions)
python generator.py

# Generate 5000 transactions
python generator.py --n 5000

# Outputs:
#   data/synthetic_transactions.csv   (with labels — for training)
#   data/synthetic_transactions.json  (webhook payloads — no labels)
#   data/anomaly_labels.json          (ground truth)
```

## References

- Visa Inc. — Global fraud rate: ~0.1 % of transaction volume
- Mastercard — Reported fraud rate: ~0.1–0.5 % depending on region
- FinTrack PoC uses 2 % for sufficient ML training signal
