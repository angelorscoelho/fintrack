"""
FinTrack AI — ML Scorer
IsolationForest wrapper. Loads model from Lambda Layer.
Implemented in: Session S04E
"""


def score_transaction(payload: dict) -> float:
    """Returns anomaly_score float [0.0, 1.0]. Implemented in S04E."""
    return 0.5  # placeholder
