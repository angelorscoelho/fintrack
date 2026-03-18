"""
FinTrack AI — Synthetic Transaction Data Generator
Produces realistic financial transaction data with labeled anomalies for ML training.

Usage:
    python generator.py              # generates 1000 transactions (default)
    python generator.py --n 5000     # generates 5000 transactions

Outputs:
    data/synthetic_transactions.csv      (includes is_anomaly — for training/validation)
    data/synthetic_transactions.json     (webhook payloads only — no is_anomaly field)
    data/anomaly_labels.json             (ground truth: {transaction_id: bool})
"""
import argparse
import csv
import json
import math
import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
from faker import Faker

# ── Reproducibility ──────────────────────────────────────────────────────────
random.seed(42)
np.random.seed(42)
fake = Faker("pt_PT")
fake.seed_instance(42)

# ── Constants ────────────────────────────────────────────────────────────────
CATEGORIES = [
    "fuel", "restaurant", "travel", "technology_services",
    "medical", "consulting", "retail", "utilities",
]

# Per-category (mean_amount, std_amount) in EUR
CATEGORY_PARAMS: dict[str, tuple[float, float]] = {
    "fuel":                 (80.0,   30.0),
    "restaurant":           (45.0,   20.0),
    "travel":               (350.0,  150.0),
    "technology_services":  (250.0,  100.0),
    "medical":              (120.0,   60.0),
    "consulting":           (800.0,  300.0),
    "retail":               (60.0,   40.0),
    "utilities":            (90.0,   35.0),
}

# Country weights (Portugal heavily dominant for normal transactions)
COUNTRY_WEIGHTS = {
    "PT": 0.75, "ES": 0.08, "FR": 0.05, "DE": 0.04,
    "GB": 0.03, "US": 0.02, "CN": 0.01, "BR": 0.01, "OTHER": 0.01,
}
COUNTRIES = list(COUNTRY_WEIGHTS.keys())
COUNTRY_PROBS = list(COUNTRY_WEIGHTS.values())

# Anomaly type distribution (must sum to 0.30)
ANOMALY_DISTRIBUTION = {
    "velocity_fraud":       0.08,
    "amount_spike":         0.08,
    "geo_hopping":          0.07,
    "invoice_manipulation": 0.07,
}
NORMAL_RATIO = 0.70


# ── Helpers ───────────────────────────────────────────────────────────────────
def _random_nif() -> str:
    """Generate a fake Portuguese NIF (9 digits prefixed with PT)."""
    return "PT" + "".join([str(random.randint(0, 9)) for _ in range(9)])


def _random_timestamp(days_back: int = 30) -> str:
    """Random ISO 8601 UTC timestamp within the last N days."""
    delta = timedelta(seconds=random.randint(0, days_back * 86400))
    dt = datetime.now(timezone.utc) - delta
    return dt.isoformat()


def _random_ip() -> str:
    return f"{random.randint(1,254)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def _clip(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


# ── Transaction Builders ──────────────────────────────────────────────────────

def _build_normal() -> dict:
    """Generate a realistic normal transaction."""
    category = random.choice(CATEGORIES)
    mean, std = CATEGORY_PARAMS[category]
    prev_avg = _clip(np.random.normal(mean, std * 0.5), 5.0, mean * 3)
    amount = _clip(np.random.normal(mean, std), 1.0, mean * 4)
    hour = int(np.random.choice(range(24), p=_hour_distribution()))
    return {
        "amount": round(amount, 2),
        "category": category,
        "merchant_country": np.random.choice(COUNTRIES, p=COUNTRY_PROBS),
        "previous_avg_amount": round(prev_avg, 2),
        "hour_of_day": hour,
        "day_of_week": random.randint(0, 6),
        "transactions_last_10min": random.randint(0, 5),
        "is_anomaly": False,
        "anomaly_type": "normal",
    }


def _build_velocity_fraud() -> dict:
    """High transaction velocity + elevated amount."""
    base = _build_normal()
    base.update({
        "transactions_last_10min": random.randint(16, 40),
        "amount": round(base["previous_avg_amount"] * random.uniform(2.5, 4.0), 2),
        "is_anomaly": True,
        "anomaly_type": "velocity_fraud",
    })
    return base


def _build_amount_spike() -> dict:
    """Single large amount far above historical average."""
    base = _build_normal()
    spike_mult = random.uniform(5.0, 12.0)
    base.update({
        "amount": round(base["previous_avg_amount"] * spike_mult, 2),
        "is_anomaly": True,
        "anomaly_type": "amount_spike",
    })
    return base


def _build_geo_hopping() -> dict:
    """Foreign country transaction during off-hours."""
    base = _build_normal()
    foreign = random.choice([c for c in COUNTRIES if c != "PT"])
    base.update({
        "merchant_country": foreign,
        "hour_of_day": random.randint(1, 4),   # 01:00–04:00
        "is_anomaly": True,
        "anomaly_type": "geo_hopping",
    })
    return base


def _build_invoice_manipulation() -> dict:
    """Consulting invoice with suspiciously round large amount."""
    base = _build_normal()
    # Amount is a round multiple of 1000, between 9000 and 50000
    rounded = random.choice([9000, 10000, 15000, 20000, 25000, 30000, 50000])
    base.update({
        "category": "consulting",
        "amount": float(rounded),
        "previous_avg_amount": round(random.uniform(200, 800), 2),
        "is_anomaly": True,
        "anomaly_type": "invoice_manipulation",
    })
    return base


def _hour_distribution() -> list[float]:
    """Realistic distribution of transaction hours (peak 9-18h)."""
    weights = [
        0.005, 0.003, 0.002, 0.002, 0.003, 0.008,  # 00-05
        0.015, 0.030, 0.055, 0.075, 0.080, 0.082,  # 06-11
        0.085, 0.082, 0.078, 0.075, 0.070, 0.065,  # 12-17
        0.055, 0.045, 0.035, 0.025, 0.015, 0.010,  # 18-23
    ]
    total = sum(weights)
    return [w / total for w in weights]


# ── Main Generator ────────────────────────────────────────────────────────────

ANOMALY_BUILDERS = {
    "velocity_fraud":       _build_velocity_fraud,
    "amount_spike":         _build_amount_spike,
    "geo_hopping":          _build_geo_hopping,
    "invoice_manipulation": _build_invoice_manipulation,
}


def generate_dataset(n: int = 1000) -> list[dict]:
    """Generate n transactions with correct anomaly distribution."""
    records = []

    # Calculate counts
    anomaly_counts = {k: round(v * n) for k, v in ANOMALY_DISTRIBUTION.items()}
    normal_count = n - sum(anomaly_counts.values())

    # Build anomaly records
    for anomaly_type, count in anomaly_counts.items():
        builder = ANOMALY_BUILDERS[anomaly_type]
        for _ in range(count):
            record = builder()
            record["transaction_id"] = str(uuid.uuid4())
            record["timestamp"] = _random_timestamp()
            record["merchant_nif"] = _random_nif()
            record["merchant_name"] = fake.company()
            record["ip_address"] = _random_ip()
            records.append(record)

    # Build normal records
    for _ in range(normal_count):
        record = _build_normal()
        record["transaction_id"] = str(uuid.uuid4())
        record["timestamp"] = _random_timestamp()
        record["merchant_nif"] = _random_nif()
        record["merchant_name"] = fake.company()
        record["ip_address"] = _random_ip()
        records.append(record)

    # Shuffle to mix anomalies and normals
    random.shuffle(records)
    return records


def save_outputs(records: list[dict], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    # CSV (includes is_anomaly — for ML training and validation)
    csv_path = output_dir / "synthetic_transactions.csv"
    fieldnames = [
        "transaction_id", "timestamp", "merchant_nif", "merchant_name",
        "amount", "category", "ip_address", "merchant_country",
        "previous_avg_amount", "hour_of_day", "day_of_week",
        "transactions_last_10min", "is_anomaly", "anomaly_type",
    ]
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)

    # JSON webhook payloads (NO is_anomaly — simulates real webhook)
    webhook_fields = [f for f in fieldnames if f not in ("is_anomaly", "anomaly_type")]
    webhook_records = [{k: r[k] for k in webhook_fields} for r in records]
    json_path = output_dir / "synthetic_transactions.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(webhook_records, f, ensure_ascii=False, indent=2)

    # Ground truth labels
    labels = {r["transaction_id"]: r["is_anomaly"] for r in records}
    labels_path = output_dir / "anomaly_labels.json"
    with open(labels_path, "w") as f:
        json.dump(labels, f, indent=2)

    # Statistics
    total = len(records)
    anomaly_total = sum(1 for r in records if r["is_anomaly"])
    print(f"\n{'─' * 50}")
    print(f"Generated {total} transactions")
    print(f"  Normal:  {total - anomaly_total} ({(total - anomaly_total)/total*100:.1f}%)")
    print(f"  Anomaly: {anomaly_total} ({anomaly_total/total*100:.1f}%)")
    for atype in ANOMALY_DISTRIBUTION:
        count = sum(1 for r in records if r.get("anomaly_type") == atype)
        print(f"    {atype}: {count} ({count/total*100:.1f}%)")
    print(f"{'─' * 50}")
    print(f"Saved: {csv_path}")
    print(f"Saved: {json_path}")
    print(f"Saved: {labels_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic FinTrack transactions")
    parser.add_argument("--n", type=int, default=1000, help="Number of transactions")
    parser.add_argument("--output", type=str, default="data", help="Output directory")
    args = parser.parse_args()

    records = generate_dataset(args.n)
    save_outputs(records, Path(args.output))


if __name__ == "__main__":
    main()
