"""Pydantic v2 response models for FinTrack AI API."""
import json
from decimal import Decimal
from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, Field, computed_field, field_validator

from shared.project_constants import classify_risk


class AlertStatus(str, Enum):
    NORMAL = "NORMAL"
    PENDING_REVIEW = "PENDING_REVIEW"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"
    RATE_LIMITED = "rate_limited"


class ResolutionType(str, Enum):
    CONFIRMED_FRAUD = "CONFIRMED_FRAUD"
    FALSE_POSITIVE = "FALSE_POSITIVE"
    ESCALATED = "ESCALATED"


class XAIBullet(BaseModel):
    id: int
    icon: str
    text: str


class XAIExplanation(BaseModel):
    bullets: List[XAIBullet]
    risk_level: str
    summary_pt: str


class AlertResponse(BaseModel):
    transaction_id: str
    timestamp: str
    merchant_nif: Optional[str] = Field(
        default=None,
        deprecated=True,
        description="Deprecated: prefer source_account and destination_account for display.",
    )
    merchant_name: Optional[str] = None
    source_account: Optional[str] = None
    destination_account: Optional[str] = None
    source_country: Optional[str] = None
    destination_country: Optional[str] = None
    payment_platform: Optional[str] = None
    amount: float
    category: str
    ip_address: Optional[str] = None
    merchant_country: Optional[str] = None
    previous_avg_amount: Optional[float] = None
    hour_of_day: Optional[int] = None
    day_of_week: Optional[int] = None
    transactions_last_10min: Optional[int] = None
    anomaly_score: float
    status: AlertStatus
    ai_explanation: Optional[dict] = None
    sar_draft: Optional[str] = None
    processed_at: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_type: Optional[str] = None
    analyst_notes: Optional[str] = None

    @computed_field
    @property
    def risk_level(self) -> str:
        """Computed from anomaly_score using shared thresholds — CRITICAL/HIGH/MEDIUM/LOW."""
        return classify_risk(self.anomaly_score)

    @field_validator("ai_explanation", mode="before")
    @classmethod
    def parse_ai_explanation(cls, v: Any) -> Optional[dict]:
        """Safely coerce ai_explanation to dict or None; never raise on bad data."""
        if v is None or v == "" or v == "null":
            return None
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, dict) else None
            except (json.JSONDecodeError, TypeError):
                return None
        if isinstance(v, dict):
            return v
        return None

    @field_validator("anomaly_score", "amount", "previous_avg_amount", mode="before")
    @classmethod
    def coerce_decimal(cls, v: Any) -> Optional[float]:
        """DynamoDB returns Decimal — convert to float for JSON serialization."""
        if v is None:
            return None
        if isinstance(v, Decimal):
            return float(v)
        if isinstance(v, str):
            try:
                return float(v)
            except ValueError:
                return 0.0
        return float(v) if v else 0.0


class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    page_size: int


class StatsResponse(BaseModel):
    total: int
    last_24h: int = 0
    pending: int
    critical: int
    resolved: int
    false_positives: int
    rate_limited: int
    confirmed_fraud: int
    fp_rate: float
    avg_score: float
    fraud_rate: float
    rate_limits: dict
