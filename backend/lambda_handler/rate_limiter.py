"""
FinTrack AI — Gemini API Rate Limiter
Atomic DynamoDB counter. Thread-safe by design (UpdateItem conditional).

WARNING: Do NOT use GetItem + PutItem — race condition under concurrent Lambda.
UpdateItem with ConditionExpression is the only safe atomic pattern.
"""
import logging
import os
from datetime import datetime, timedelta, timezone

import boto3
from botocore.exceptions import ClientError

from shared.project_constants import (
    GEMINI_FLASH_DAILY_LIMIT as _DEFAULT_FLASH_LIMIT,
    GEMINI_PRO_DAILY_LIMIT as _DEFAULT_PRO_LIMIT,
    RATE_LIMITER_TTL_DAYS,
)

logger = logging.getLogger(__name__)

_dynamodb = boto3.resource("dynamodb")
_RATE_TABLE = os.environ.get("RATE_LIMITER_TABLE", "gemini_rate_limiter")

# Limits — read from env (set from SSM in Lambda env vars or local .env),
# falling back to centralized project constants
FLASH_DAILY_LIMIT = int(os.environ.get("GEMINI_FLASH_DAILY_LIMIT", str(_DEFAULT_FLASH_LIMIT)))
PRO_DAILY_LIMIT   = int(os.environ.get("GEMINI_PRO_DAILY_LIMIT", str(_DEFAULT_PRO_LIMIT)))


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _ttl_expiry() -> int:
    """Unix timestamp for auto-expiry based on configured retention."""
    return int((datetime.now(timezone.utc) + timedelta(days=RATE_LIMITER_TTL_DAYS)).timestamp())


def check_and_increment(model_type: str) -> bool:
    """
    Atomically check and increment the daily counter for model_type.

    Args:
        model_type: "flash" or "pro"

    Returns:
        True  → counter incremented, API call is allowed
        False → daily limit reached, API call must be skipped

    Implementation:
        Uses DynamoDB UpdateItem with ConditionExpression to ensure atomicity.
        If flash_count >= FLASH_DAILY_LIMIT, the condition fails → ClientError
        → we return False without incrementing.
    """
    table   = _dynamodb.Table(_RATE_TABLE)
    counter = f"{model_type}_count"
    limit   = FLASH_DAILY_LIMIT if model_type == "flash" else PRO_DAILY_LIMIT
    date    = _today()

    try:
        table.update_item(
            Key={"date": date},
            # Initialize counter to 0 if item doesn't exist, then increment
            UpdateExpression=(
                "SET #c = if_not_exists(#c, :zero) + :one, "
                "    #ttl = if_not_exists(#ttl, :ttl)"
            ),
            # Only allow increment if current value < limit
            ConditionExpression="#c < :limit OR attribute_not_exists(#c)",
            ExpressionAttributeNames={
                "#c":   counter,
                "#ttl": "ttl",
            },
            ExpressionAttributeValues={
                ":zero":  0,
                ":one":   1,
                ":limit": limit,
                ":ttl":   _ttl_expiry(),
            },
        )
        logger.debug(f"Rate limiter: {model_type} incremented (limit={limit})")
        return True

    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.warning(
                f"Rate limit reached for {model_type}: "
                f"{limit} calls/day exhausted for {date}"
            )
            return False
        # Unexpected DynamoDB error — allow the call (fail open, not closed)
        logger.error(f"Rate limiter DynamoDB error: {e}. Allowing call.")
        return True


def get_today_counts() -> dict:
    """Return today's usage counts. Used by /api/stats endpoint."""
    table = _dynamodb.Table(_RATE_TABLE)
    try:
        response = table.get_item(Key={"date": _today()})
        item = response.get("Item", {})
        return {
            "flash_count": int(item.get("flash_count", 0)),
            "pro_count":   int(item.get("pro_count", 0)),
            "flash_limit": FLASH_DAILY_LIMIT,
            "pro_limit":   PRO_DAILY_LIMIT,
            "date":        _today(),
        }
    except Exception as exc:
        logger.error(f"get_today_counts failed: {exc}")
        return {"flash_count": 0, "pro_count": 0,
                "flash_limit": FLASH_DAILY_LIMIT, "pro_limit": PRO_DAILY_LIMIT}
