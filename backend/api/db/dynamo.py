"""DynamoDB client wrapper for FinTrack AI API."""
import json
import logging
import os
from decimal import Decimal
from typing import Any, Optional, Tuple, List

import boto3
from boto3.dynamodb.conditions import Key

logger = logging.getLogger(__name__)

_table = None


def init_dynamo_client() -> None:
    global _table
    dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "eu-west-1"))
    _table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE", "transactions"))
    logger.info(f"DynamoDB client initialized: {_table.table_name}")


def get_table():
    if _table is None:
        raise RuntimeError("DynamoDB client not initialized. Call init_dynamo_client() first.")
    return _table


def _deserialize_item(item: dict) -> dict:
    """Parse ai_explanation from JSON string to dict."""
    if item.get("ai_explanation") and isinstance(item["ai_explanation"], str):
        try:
            item["ai_explanation"] = json.loads(item["ai_explanation"])
        except (json.JSONDecodeError, TypeError):
            item["ai_explanation"] = None
    return item


async def get_alerts_by_status(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[dict], int]:
    table = get_table()
    try:
        if status:
            response = table.query(
                IndexName="status-timestamp-index",
                KeyConditionExpression=Key("status").eq(status),
                ScanIndexForward=False,
                Limit=limit + offset,
            )
        else:
            response = table.scan(Limit=limit + offset)

        items = [_deserialize_item(i) for i in response.get("Items", [])]
        total = response.get("Count", len(items))
        return items[offset : offset + limit], total

    except Exception as exc:
        logger.error(f"DynamoDB query failed: {exc}")
        return [], 0


async def get_alert_by_id(transaction_id: str) -> Optional[dict]:
    table = get_table()
    try:
        response = table.get_item(Key={"transaction_id": transaction_id})
        item = response.get("Item")
        if item:
            return _deserialize_item(item)
        return None
    except Exception as exc:
        logger.error(f"DynamoDB get_item failed for {transaction_id}: {exc}")
        return None


async def get_stats() -> dict:
    table = get_table()
    try:
        result = table.scan(
            ProjectionExpression="anomaly_score, #s, resolution_type",
            ExpressionAttributeNames={"#s": "status"},
        )
        items = result.get("Items", [])
        total = len(items)
        pending = sum(1 for i in items if i.get("status") == "PENDING_REVIEW")
        resolved = sum(1 for i in items if i.get("status") == "RESOLVED")
        fp = sum(1 for i in items if i.get("status") == "FALSE_POSITIVE")
        scores = [float(i.get("anomaly_score", 0)) for i in items if i.get("anomaly_score")]
        critical = sum(1 for s in scores if s > 0.90)
        fp_rate = round(fp / max(resolved + fp, 1), 3)
        avg_score = round(sum(scores) / max(len(scores), 1), 3)
        return {"total": total, "pending": pending, "critical": critical,
                "resolved": resolved, "false_positives": fp,
                "fp_rate": fp_rate, "avg_score": avg_score}
    except Exception as exc:
        logger.error(f"Stats query failed: {exc}")
        return {"total": 0, "pending": 0, "critical": 0, "resolved": 0,
                "false_positives": 0, "fp_rate": 0.0, "avg_score": 0.0}
