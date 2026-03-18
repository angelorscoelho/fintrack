"""Pydantic response models. Implemented in Session S07E."""
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class AlertStatus(str, Enum):
    NORMAL = "NORMAL"
    PENDING_REVIEW = "PENDING_REVIEW"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class AlertResponse(BaseModel):
    transaction_id: str
    status: AlertStatus
    anomaly_score: float = 0.0


class AlertListResponse(BaseModel):
    items: List[AlertResponse] = []
    total: int = 0
