"""
FinTrack AI — IsolationForest Training Script
Trains on synthetic_transactions.csv and saves model.pkl for Lambda Layer.

Usage:
    python data/train_model.py
    python data/train_model.py --input data/synthetic_transactions.csv --output backend/lambda_layer/model.pkl

Output:
    backend/lambda_layer/model.pkl   (IsolationForest + LabelEncoder)
    data/training_report.json        (metrics, score distribution)
"""
import argparse
import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import precision_score, recall_score, f1_score
from sklearn.preprocessing import LabelEncoder


# ── Feature Engineering (CANONICAL VERSION — must match ml_scorer.py exactly) ──
CATEGORIES = [
    "fuel", "restaurant", "travel", "technology_services",
    "medical", "consulting", "retail", "utilities",
]


def build_feature_matrix(df: pd.DataFrame, label_encoder: LabelEncoder) -> np.ndarray:
    """
    Converts raw transaction DataFrame into feature matrix for IsolationForest.
    
    Features (9 total):
        0: amount_ratio         = amount / max(previous_avg_amount, 1)
        1: velocity_score       = transactions_last_10min / 10.0
        2: hour_sin             = sin(2π * hour_of_day / 24)
        3: hour_cos             = cos(2π * hour_of_day / 24)
        4: day_of_week_norm     = day_of_week / 6.0
        5: amount_log           = log1p(amount)
        6: is_off_hours         = 1 if hour_of_day in [0..5], else 0
        7: is_foreign           = 1 if merchant_country != "PT", else 0
        8: category_encoded     = LabelEncoder ordinal for category
    """
    features = pd.DataFrame({
        "amount_ratio":     df["amount"] / df["previous_avg_amount"].clip(lower=1.0),
        "velocity_score":   df["transactions_last_10min"] / 10.0,
        "hour_sin":         np.sin(2 * np.pi * df["hour_of_day"] / 24),
        "hour_cos":         np.cos(2 * np.pi * df["hour_of_day"] / 24),
        "day_norm":         df["day_of_week"] / 6.0,
        "amount_log":       np.log1p(df["amount"]),
        "is_off_hours":     df["hour_of_day"].between(0, 5).astype(int),
        "is_foreign":       (df["merchant_country"] != "PT").astype(int),
        "category_enc":     label_encoder.transform(df["category"]),
    })
    return features.values.astype(np.float64)


def normalize_scores(raw_scores: np.ndarray) -> np.ndarray:
    """
    Convert IsolationForest raw scores to [0.0, 1.0] where 1.0 = most anomalous.
    
    IsolationForest.score_samples() returns:
        - More negative = more anomalous
        - Range is roughly [-0.5, 0.5]
    
    We invert once (so higher = more anomalous), then normalize using
    percentile-based clipping (p10/p90) for robustness to outliers.
    """
    # Invert: more negative → higher raw anomaly signal
    inverted = -raw_scores
    p_low  = np.percentile(inverted, 10)
    p_high = np.percentile(inverted, 90)
    clipped = np.clip(inverted, p_low, p_high)
    normalized = (clipped - p_low) / (p_high - p_low + 1e-9)
    return np.clip(normalized, 0.0, 1.0)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="data/synthetic_transactions.csv")
    parser.add_argument("--output", default="backend/lambda_layer/model.pkl")
    parser.add_argument("--labels", default="data/anomaly_labels.json")
    args = parser.parse_args()

    # ── Load data ────────────────────────────────────────────────────────────
    print(f"Loading data from {args.input}...")
    df = pd.read_csv(args.input)
    print(f"  Loaded {len(df)} records.")

    with open(args.labels) as f:
        labels_dict = json.load(f)
    y_true = df["transaction_id"].map(labels_dict).fillna(False).astype(int)

    # ── Label Encoder ────────────────────────────────────────────────────────
    le = LabelEncoder()
    le.fit(CATEGORIES)

    # Handle unseen categories gracefully (map to 0)
    df["category"] = df["category"].apply(
        lambda c: c if c in CATEGORIES else CATEGORIES[0]
    )

    # ── Feature Matrix ───────────────────────────────────────────────────────
    X = build_feature_matrix(df, le)
    print(f"  Feature matrix shape: {X.shape}")

    # ── Train IsolationForest ────────────────────────────────────────────────
    print("Training IsolationForest...")
    model = IsolationForest(
        n_estimators=200,
        contamination=0.0006,   # matches research-backed fraud rate: ~0.06 % by count (EU/SEPA)
        max_samples="auto",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)

    # ── Score normalization calibration ─────────────────────────────────────
    raw_scores = model.score_samples(X)
    normalized_scores = normalize_scores(raw_scores)

    # Compute normalization bounds for inference (store in artifact)
    inverted = -raw_scores
    norm_min = float(np.percentile(inverted, 10))
    norm_max = float(np.percentile(inverted, 90))

    # ── Evaluate ─────────────────────────────────────────────────────────────
    y_pred = (normalized_scores >= 0.70).astype(int)
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall    = recall_score(y_true, y_pred, zero_division=0)
    f1        = f1_score(y_true, y_pred, zero_division=0)

    print(f"\nModel Evaluation (threshold=0.70):")
    print(f"  Precision: {precision:.3f}  (target: > 0.70)")
    print(f"  Recall:    {recall:.3f}   (target: > 0.65)")
    print(f"  F1 Score:  {f1:.3f}")

    score_dist = {
        "mean":   float(np.mean(normalized_scores)),
        "std":    float(np.std(normalized_scores)),
        "p70":    float(np.percentile(normalized_scores, 70)),
        "p90":    float(np.percentile(normalized_scores, 90)),
        "p99":    float(np.percentile(normalized_scores, 99)),
        "above_070": int(np.sum(normalized_scores >= 0.70)),
        "above_090": int(np.sum(normalized_scores >= 0.90)),
    }
    print(f"\nScore Distribution: {json.dumps(score_dist, indent=2)}")

    # ── Save artifact ─────────────────────────────────────────────────────────
    artifact = {
        "model": model,
        "label_encoder": le,
        "categories": CATEGORIES,
        "norm_min": norm_min,
        "norm_max": norm_max,
        "feature_names": [
            "amount_ratio", "velocity_score", "hour_sin", "hour_cos",
            "day_norm", "amount_log", "is_off_hours", "is_foreign", "category_enc",
        ],
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        pickle.dump(artifact, f, protocol=4)
    print(f"\nModel saved to {output_path} ({output_path.stat().st_size / 1024:.1f} KB)")

    # Save training report
    report = {
        "precision": precision, "recall": recall, "f1": f1,
        "score_distribution": score_dist,
        "norm_min": norm_min, "norm_max": norm_max,
        "n_estimators": 200, "contamination": 0.0006,
    }
    report_path = Path("data/training_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Training report saved to {report_path}")


if __name__ == "__main__":
    main()
