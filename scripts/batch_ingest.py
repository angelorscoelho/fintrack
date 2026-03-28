#!/usr/bin/env python3
"""
Batch-ingest synthetic transactions via API Gateway POST /ingest (SQS → Lambda → DynamoDB),
then apply DynamoDB pin updates for demo KPIs (confirmed fraud + high-score pending).

Environment variables:
  FINTRACK_INGEST_URL — POST target (SAM output IngestEndpoint), e.g.
    https://<api-id>.execute-api.<region>.amazonaws.com/dev/ingest
  AWS_REGION            — default: eu-west-1
  DYNAMODB_TABLE        — default: transactions
  AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — standard boto3 credentials

Examples:
  python scripts/batch_ingest.py --n 10000 --dry-run
  python scripts/batch_ingest.py --n 10000
  python scripts/batch_ingest.py --skip-ingest --n 10000   # only DynamoDB pin step
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Project root → import data/generator.py
_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT / "data"))
from generator import generate_dataset  # noqa: E402

try:
    import boto3
except ImportError:
    boto3 = None  # type: ignore

WEBHOOK_SKIP = frozenset({"is_anomaly", "anomaly_type"})


def _payload_for_ingest(record: dict) -> dict:
    return {k: v for k, v in record.items() if k not in WEBHOOK_SKIP}


def _post_ingest(url: str, body: dict, timeout: float = 30.0) -> int:
    data = json.dumps(body, default=str).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return int(resp.status)


def _pin_rows(
    table_name: str,
    region: str,
    confirm_ids: list[str],
    pending_ids: list[str],
) -> None:
    if boto3 is None:
        raise RuntimeError("boto3 required for pin step: pip install boto3")
    dynamodb = boto3.resource("dynamodb", region_name=region)
    table = dynamodb.Table(table_name)
    now = datetime.now(timezone.utc).isoformat()
    scores_cf = ["0.915", "0.967"]
    scores_pd = ["0.912", "0.934", "0.951", "0.948", "0.923", "0.978"]

    for idx, tid in enumerate(confirm_ids):
        table.update_item(
            Key={"transaction_id": tid},
            UpdateExpression=(
                "SET #s = :st, anomaly_score = :sc, resolution_type = :rt, "
                "resolved_at = :ra REMOVE #ttl"
            ),
            ExpressionAttributeNames={"#s": "status", "#ttl": "ttl"},
            ExpressionAttributeValues={
                ":st": "RESOLVED",
                ":sc": scores_cf[idx % len(scores_cf)],
                ":rt": "CONFIRMED_FRAUD",
                ":ra": now,
            },
        )

    for idx, tid in enumerate(pending_ids):
        table.update_item(
            Key={"transaction_id": tid},
            UpdateExpression="SET #s = :st, anomaly_score = :sc REMOVE #ttl, #rt, #ra",
            ExpressionAttributeNames={
                "#s": "status",
                "#ttl": "ttl",
                "#rt": "resolution_type",
                "#ra": "resolved_at",
            },
            ExpressionAttributeValues={
                ":st": "PENDING_REVIEW",
                ":sc": scores_pd[idx % len(scores_pd)],
            },
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="FinTrack batch ingest + DynamoDB pin")
    parser.add_argument("--n", type=int, default=10_000, help="Total transactions (default 10000)")
    parser.add_argument("--dry-run", action="store_true", help="Generate payloads only; no HTTP / no DynamoDB")
    parser.add_argument(
        "--skip-ingest",
        action="store_true",
        help="Skip HTTP ingest; only run DynamoDB pin (requires prior ingest for same IDs)",
    )
    parser.add_argument("--rps", type=float, default=25.0, help="Max POSTs per second (default 25)")
    parser.add_argument("--sleep-after-ingest", type=float, default=45.0, help="Seconds to wait before pin")
    args = parser.parse_args()

    ingest_url = os.environ.get("FINTRACK_INGEST_URL", "").strip()
    region = os.environ.get("AWS_REGION", "eu-west-1")
    table_name = os.environ.get("DYNAMODB_TABLE", "transactions")

    records = generate_dataset(args.n, shuffle_records=False)
    for i, rec in enumerate(records):
        rec["transaction_id"] = f"ft-batch-{i:08d}"

    confirm_ids = [records[0]["transaction_id"], records[1]["transaction_id"]]
    pending_ids = [records[i]["transaction_id"] for i in range(2, 8)]

    if args.dry_run:
        print(f"Dry run: {len(records)} payloads; confirm={confirm_ids}; pending={pending_ids}")
        sample = _payload_for_ingest(records[0])
        print("Sample payload keys:", sorted(sample.keys()))
        return 0

    if args.skip_ingest:
        print("Skipping ingest; applying DynamoDB pin only...")
        _pin_rows(table_name, region, confirm_ids, pending_ids)
        print("Pin complete.")
        return 0

    if not ingest_url:
        print("ERROR: FINTRACK_INGEST_URL is not set.", file=sys.stderr)
        return 1

    delay = 1.0 / max(args.rps, 0.1)
    print(f"Posting {len(records)} transactions to {ingest_url} (~{args.rps} rps)...")
    for i, rec in enumerate(records):
        body = _payload_for_ingest(rec)
        try:
            status = _post_ingest(ingest_url, body)
            if status not in (200, 201, 202):
                print(f"Warning: HTTP {status} for {rec['transaction_id']}", file=sys.stderr)
        except urllib.error.HTTPError as e:
            print(f"HTTP error {e.code} for {rec['transaction_id']}: {e.reason}", file=sys.stderr)
            return 1
        except urllib.error.URLError as e:
            print(f"URL error for {rec['transaction_id']}: {e}", file=sys.stderr)
            return 1
        if (i + 1) % 500 == 0:
            print(f"  Posted {i + 1}/{len(records)}")
        time.sleep(delay)

    print(f"Waiting {args.sleep_after_ingest}s for Lambda processing...")
    time.sleep(args.sleep_after_ingest)

    print("Pinning demo rows in DynamoDB...")
    _pin_rows(table_name, region, confirm_ids, pending_ids)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
