# FinTrack AI — Synthetic Data

## Overview

This directory contains synthetic transaction data used for ML training, validation,
and dashboard development. All generators produce **realistic fraud distributions**
matching industry benchmarks (Mastercard/Visa fraud rate: 0.01–0.025 %).

## Files

| File | Purpose |
|------|---------|
| `generator.py` | Generates labelled transactions for ML training (CSV + JSON) |
| `train_model.py` | Trains IsolationForest anomaly detection model |
| `populate_dynamodb.py` | Batch-loads synthetic data into DynamoDB |
| `training_report.json` | Model evaluation metrics from last training run |
| `requirements.txt` | Python dependencies for data scripts |

## Data Distribution

### Anomaly Rate: ≈ 0.025 % — Real-world: 0.01–0.025 %

The fraud rate matches Mastercard/Visa research (0.01–0.025 % of transaction volume).
IsolationForest is unsupervised and learns "normal" behaviour; it does not require
labelled fraud samples to detect anomalies effectively.

### Frontend Mock Dataset (80 transactions)

| Category | Count | % of Total | Score Range |
|----------|------:|----------:|-------------|
| NORMAL | 66 | 82.5 % | 0.001–0.35 (lognormal, median ≈ 0.01) |
| PENDING_REVIEW (high) | 8 | 10.0 % | 0.70–0.90 |
| PENDING_REVIEW (critical) | 4 | 5.0 % | 0.90–0.995 |
| FALSE_POSITIVE (resolved) | 2 | 2.5 % | 0.70–0.82 |
| CONFIRMED_FRAUD (resolved) | 0 | 0.0 % | — (80 × 0.025 % ≈ 0) |

**Key Metrics:**

- **Average Score:** 10–18 % (target)
- **Fraud Rate:** 0.0 % (correct for a sample of 80 at 0.025 % base rate)
- **Score Distribution:** Lognormal for normal transactions (not uniform)

### Training Dataset (`generator.py`, default 1 000 transactions)

| Anomaly Type | Rate |
|--------------|-----:|
| `velocity_fraud` | 0.00625 % |
| `amount_spike` | 0.00625 % |
| `geo_hopping` | 0.00625 % |
| `invoice_manipulation` | 0.00625 % |
| **Total anomaly** | **0.025 %** |
| Normal | 99.975 % |

## Score Distribution

Normal (non-anomalous) transactions use a **lognormal** score distribution:

- **μ = -4.5, σ = 0.7** (frontend mock data)
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

# Generate 50000 transactions (enough for ~12 true anomalies at 0.025 %)
python generator.py --n 50000

# Outputs:
#   data/synthetic_transactions.csv   (with labels — for training)
#   data/synthetic_transactions.json  (webhook payloads — no labels)
#   data/anomaly_labels.json          (ground truth)
```

## References

- Mastercard — Reported fraud rate: ~0.01–0.025 % depending on region
- Visa Inc. — Global fraud rate: ~0.01–0.025 % of transaction volume
- IsolationForest contamination parameter aligned to 0.00025 (0.025 %)
