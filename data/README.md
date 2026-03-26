# FinTrack AI — Synthetic Data

## Overview

This directory contains synthetic transaction data used for ML training, validation,
and dashboard development. All generators produce **realistic fraud distributions**
matching industry benchmarks.

## Research-Backed Fraud Rate: ~0.06 % by transaction count

The fraud rate used across the project is derived from cross-referencing multiple
authoritative sources. All figures below refer to card payment fraud.

### Sources Consulted

| # | Source | Metric | Value | Notes |
|---|--------|--------|------:|-------|
| 1 | **Nilson Report** (2023, issue #1229) | Global fraud by value | 0.086 % (8.6 bps) | $33.83 B fraud / $39.37 T volume. Industry gold standard since 1970. |
| 2 | **ECB 7th Card Fraud Report** (Aug 2023) | SEPA fraud by value | 0.028 % (2.8 bps) | Covers 2021 data. Lower due to EMV chip + PSD2/SCA. |
| 3 | **Visa Inc.** (Annual Report 2023) | Global fraud by value | ~0.07–0.10 % | "Prevented $40 B+ in fraud". Net rate 5–10 bps. |
| 4 | **Mastercard** (Annual Report 2023) | Global fraud by value | ~0.05–0.10 % | "Decision Intelligence" reduces false declines 50 %. |
| 5 | **UK Finance** (Annual Fraud Report 2024) | UK card fraud by value | 0.046 % (4.6 bps) | £1.2 B losses; 64 % of attempted fraud prevented. |
| 6 | **Federal Reserve** (Reg II, 2021) | US debit fraud by value | 0.072 % (7.2 bps) | Consistent with Nilson. |
| 7 | **Banco de Portugal / ECB** | PT/SEPA fraud by value | ~0.028 % | Follows SEPA average (PSD2/SCA). |

### By-Value vs By-Count

Most published reports cite fraud **by value** (dollars lost ÷ dollars processed).
A fraud detection system like FinTrack measures fraud **by transaction count**
(fraudulent transactions ÷ total transactions). The relationship depends on whether
fraudulent transactions are higher or lower than the average:

- Fraudulent transactions often have **higher amounts** (account takeovers, large
  purchases), making by-value rates **higher** than by-count rates.
- Estimated factor: by-count ≈ by-value × 0.5–0.8 for mixed channels.
- EU/SEPA by-value: ~0.028 %. Estimated by-count: ~0.03–0.06 %.
- Global by-value: ~0.086 %. Estimated by-count: ~0.05–0.07 %.

### By Transaction Channel (ECB + UK Finance)

| Channel | Fraud Rate (by value) | Notes |
|---------|---------------------:|-------|
| Card-Not-Present (online) | 0.050–0.100 % | ~80 % of all card fraud |
| Card-Present (POS/retail) | 0.005–0.015 % | EMV chip protection |
| ATM | 0.002–0.005 % | PIN-protected |
| Contactless | 0.005–0.010 % | Transaction limits help |

### FinTrack Chosen Value

**0.06 % by transaction count** (6 basis points)

Reasoning:
- FinTrack is EU/Portugal-based (SEPA area, PSD2/SCA protections)
- Processes mixed channels (online + POS + contactless)
- ECB SEPA by-value: 0.028 %. Adjusted for by-count + channel mix → ~0.04–0.06 %
- Cross-checked with Nilson global data (0.086 % by value → ~0.05–0.07 % by count)
- Conservative midpoint chosen: **0.06 %**
- Defensible range: 0.04–0.10 % (model and data variability acknowledged)

## Files

| File | Purpose |
|------|---------|
| `generator.py` | Generates labelled transactions for ML training (CSV + JSON) |
| `train_model.py` | Trains IsolationForest anomaly detection model |
| `populate_dynamodb.py` | Batch-loads synthetic data into DynamoDB |
| `training_report.json` | Model evaluation metrics from last training run |
| `requirements.txt` | Python dependencies for data scripts |

## Data Distribution

### Anomaly Rate: ≈ 0.06 % (6 bps) — EU/SEPA by-count midpoint

### Frontend Mock Dataset (80 transactions)

| Category | Count | % of Total | Score Range |
|----------|------:|----------:|-------------|
| NORMAL | 66 | 82.5 % | 0.001–0.35 (lognormal, median ≈ 0.01) |
| PENDING_REVIEW (high) | 8 | 10.0 % | 0.70–0.90 |
| PENDING_REVIEW (critical) | 4 | 5.0 % | 0.90–0.995 |
| FALSE_POSITIVE (resolved) | 2 | 2.5 % | 0.70–0.82 |
| CONFIRMED_FRAUD (resolved) | 0 | 0.0 % | — (80 × 0.06 % ≈ 0.048 → rounds to 0) |

**Key Metrics:**

- **Average Score:** 10–18 % (target)
- **Fraud Rate:** 0.0 % (correct for a sample of 80 at 0.06 % base rate)
- **Score Distribution:** Lognormal for normal transactions (not uniform)

### Training Dataset (`generator.py`, default 1 000 transactions)

| Anomaly Type | Rate |
|--------------|-----:|
| `velocity_fraud` | 0.015 % |
| `amount_spike` | 0.015 % |
| `geo_hopping` | 0.015 % |
| `invoice_manipulation` | 0.015 % |
| **Total anomaly** | **0.06 %** |
| Normal | 99.94 % |

### Seed Script (`seed_dynamodb.py`)

| Parameter | Value | Reasoning |
|-----------|------:|-----------|
| Flagging rate | ~2.5 % | Industry standard 1–5 % |
| Resolution rate | ~10 % of flagged | Analyst review bandwidth |
| Confirmed fraud (of reviewed) | ~24 % | Yields 0.06 % overall |
| False positive (of reviewed) | ~76 % | Remainder |

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

# Generate 10000 transactions (enough for ~6 true anomalies at 0.06 %)
python generator.py --n 10000

# Outputs:
#   data/synthetic_transactions.csv   (with labels — for training)
#   data/synthetic_transactions.json  (webhook payloads — no labels)
#   data/anomaly_labels.json          (ground truth)
```

## References

- **Nilson Report** — "Global Card Fraud Losses Reach $33.83 Billion" (Issue #1229, 2023)
- **European Central Bank** — "Seventh report on card fraud" (August 2023)
- **Visa Inc.** — Annual Report 2023, SEC Filing (investor.visa.com)
- **Mastercard Inc.** — Annual Report 2023 (investor.mastercard.com)
- **UK Finance** — "Annual Fraud Report 2024" (ukfinance.org.uk)
- **Federal Reserve** — Regulation II Debit Card Data (federalreserve.gov)
- **Banco de Portugal / SIBS** — Payment systems statistics (bportugal.pt)
- IsolationForest contamination parameter aligned to 0.0006 (0.06 %)
