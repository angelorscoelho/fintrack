"""
FinTrack AI — Lambda Handler (v2)
SQS trigger → ML score → persist DynamoDB → fire-and-forget GenAI microservice.
Rate limiting enforced via atomic DynamoDB counter before GenAI invocation.
"""
import json
import logging
import os
import time
import urllib.request
from datetime import datetime, timedelta, timezone

import boto3

from ml_scorer import score_transaction
from rate_limiter import check_and_increment

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb    = boto3.resource("dynamodb")
TABLE_NAME  = os.environ["DYNAMODB_TABLE"]
table       = dynamodb.Table(TABLE_NAME)

GENAI_URL           = os.environ.get("GENAI_SERVICE_URL", "http://localhost:8001")

# Thresholds from shared single source of truth
# At Lambda deploy time, shared/ is in the layer alongside lambda_handler/
try:
    from shared.project_constants import XAI_THRESHOLD, SAR_THRESHOLD, NORMAL_TTL_DAYS, GENAI_INVOKE_TIMEOUT
except ImportError:
    # Fallback: read JSON directly (e.g. when shared/ is a sibling directory)
    import pathlib as _pl
    _thresholds_path = _pl.Path(__file__).resolve().parent.parent / "shared" / "project_constants.json"
    with open(_thresholds_path) as _f:
        _th = json.load(_f)
    XAI_THRESHOLD = _th["score"]["xai"]
    SAR_THRESHOLD = _th["score"]["sar"]
    NORMAL_TTL_DAYS = _th["data_retention"]["normal_ttl_days"]
    GENAI_INVOKE_TIMEOUT = _th["api"]["timeouts"]["genai_invoke_seconds"]


def lambda_handler(event: dict, context) -> dict:
    """SQS batch handler with partial failure support (ReportBatchItemFailures)."""
    batch_item_failures = []
    for record in event.get("Records", []):
        msg_id = record["messageId"]
        try:
            payload = json.loads(record["body"])
            _process(payload)
            logger.info(json.dumps({
                "event": "processed",
                "message_id": msg_id,
                "transaction_id": payload.get("transaction_id"),
            }))
        except Exception as exc:
            logger.error(json.dumps({"event": "failed", "message_id": msg_id, "error": str(exc)}))
            batch_item_failures.append({"itemIdentifier": msg_id})

    return {"batchItemFailures": batch_item_failures}


def _process(payload: dict) -> None:
    tid  = payload["transaction_id"]
    now  = datetime.now(timezone.utc).isoformat()
    score = score_transaction(payload)
    status = "NORMAL" if score < XAI_THRESHOLD else "PENDING_REVIEW"

    # TTL: NORMAL records expire after configured days; anomalies kept indefinitely
    ttl = None
    if status == "NORMAL":
        ttl = int((datetime.now(timezone.utc) + timedelta(days=NORMAL_TTL_DAYS)).timestamp())

    item = {
        **payload,
        "anomaly_score": str(score),  # String avoids DynamoDB Decimal issues
        "status":        status,
        "processed_at":  now,
    }
    if ttl:
        item["ttl"] = ttl

    table.put_item(Item=item)
    logger.info(json.dumps({"event": "scored", "transaction_id": tid,
                             "score": score, "status": status}))

    genai_invoked = False
    genai_duration_ms = 0
    genai_status = "skipped"

    if score >= XAI_THRESHOLD:
        genai_invoked = True
        t0 = time.time()
        genai_status = _maybe_invoke_genai(tid, score, payload)
        genai_duration_ms = round((time.time() - t0) * 1000)

    logger.info(json.dumps({
        "transaction_id": tid,
        "anomaly_score": score,
        "genai_invoked": genai_invoked,
        "genai_duration_ms": genai_duration_ms,
        "genai_status": genai_status,
    }))


def _maybe_invoke_genai(tid: str, score: float, payload: dict) -> str:
    """Check rate limit then fire-and-forget to GenAI microservice.

    Returns a status string: 'success', 'error', or 'rate_limited'.
    """
    # Flash rate limit check (all scores ≥ 0.70 use Flash)
    if not check_and_increment("flash"):
        logger.warning(json.dumps({"event": "rate_limited", "model": "flash", "tid": tid}))
        table.update_item(
            Key={"transaction_id": tid},
            UpdateExpression="SET #s = :rl, processing_status = :ps",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":rl": "rate_limited", ":ps": "rate_limited"},
        )
        return "rate_limited"

    # Pro rate limit check (only for score > 0.90)
    if score > SAR_THRESHOLD:
        if not check_and_increment("pro"):
            logger.warning(json.dumps({"event": "rate_limited", "model": "pro", "tid": tid}))
            # Don't block — still invoke Flash XAI, just no Pro SAR
            # Pass a flag so GenAI service skips Pro node
            payload = {**payload, "_skip_pro": True}

    return _fire_genai(tid, score, payload)


def _fire_genai(tid: str, score: float, payload: dict) -> str:
    """HTTP POST to GenAI microservice. Non-blocking (timeout=2s).

    Returns 'success' or 'error'.
    """
    try:
        body = json.dumps({"transaction_id": tid, "anomaly_score": score, "payload": payload})
        req  = urllib.request.Request(
            f"{GENAI_URL}/analyse",
            data=body.encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=GENAI_INVOKE_TIMEOUT) as resp:
            logger.info(json.dumps({"event": "genai_invoked", "tid": tid, "http": resp.status}))
        return "success"
    except Exception as exc:
        logger.warning(json.dumps({"event": "genai_invoke_failed", "tid": tid, "error": str(exc)}))
        # Non-fatal — record already persisted as PENDING_REVIEW
        return "error"
