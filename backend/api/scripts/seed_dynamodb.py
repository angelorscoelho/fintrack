"""
Seed DynamoDB with realistic test transactions for dashboard development/testing.
Usage: python -m backend.api.scripts.seed_dynamodb
"""
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3

# Configuration
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "transactions")
AWS_REGION = os.environ.get("AWS_REGION", "eu-west-1")

# Sample data for realistic transactions
MERCHANT_COUNTRIES = ["PT", "ES", "FR", "DE", "IT", "UK", "US", "BR"]
CATEGORIES = ["retail", "online", "restaurant", "gas_station", "supermarket", "electronics", "travel", "pharmacy"]
IP_PREFIXES = ["185.15.", "91.22.", "78.34.", "186.20.", "201.45.", "54.23."]
NIF_PREFIXES = ["PT", "ES", "FR", "DE", "IT"]


def generate_transaction(index: int, hours_ago: float = 0) -> dict:
    """Generate a realistic transaction record."""
    tx_id = f"TXN-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{index:06d}"
    
    # Base amount varies by category
    category = random.choice(CATEGORIES)
    base_amounts = {
        "retail": (10, 500),
        "online": (5, 300),
        "restaurant": (10, 150),
        "gas_station": (20, 100),
        "supermarket": (15, 200),
        "electronics": (50, 2000),
        "travel": (100, 3000),
        "pharmacy": (5, 100),
    }
    amount_min, amount_max = base_amounts.get(category, (10, 500))
    amount = round(random.uniform(amount_min, amount_max), 2)
    
    # Merchant NIF with country prefix
    nif_prefix = random.choice(NIF_PREFIXES)
    nif_number = random.randint(100000000, 999999999)
    merchant_nif = f"{nif_prefix}{nif_number}"
    
    # IP address
    ip_address = f"{random.choice(IP_PREFIXES)}{random.randint(1,255)}.{random.randint(1,255)}"
    
    # Timestamps
    timestamp = datetime.now(timezone.utc) - timedelta(hours=hours_ago, minutes=random.randint(0, 59))
    
    # Anomaly score — realistic distribution (≈2 % fraud rate)
    # Most transactions are normal with very low scores (lognormal-like).
    score = random.random()
    if score < 0.80:
        anomaly_score = round(random.uniform(0.0, 0.15), 3)    # Normal — low risk
        status = "NORMAL"
    elif score < 0.90:
        anomaly_score = round(random.uniform(0.15, 0.50), 3)   # Normal — slightly elevated
        status = "NORMAL"
    elif score < 0.975:
        anomaly_score = round(random.uniform(0.70, 0.90), 3)   # Flagged — high
        status = "PENDING_REVIEW"
    else:
        anomaly_score = round(random.uniform(0.90, 1.0), 3)    # Critical
        status = "PENDING_REVIEW"
    
    # Resolve ~15 % of flagged transactions:
    #   effective CONFIRMED_FRAUD ≈ 15 % × 35 % ≈ 5 % of flagged
    #   effective FALSE_POSITIVE  ≈ 15 % × 65 % ≈ 10 % of flagged
    resolution_type = None
    if status == "PENDING_REVIEW" and random.random() < 0.15:
        if random.random() < 0.35:
            status = "RESOLVED"
            resolution_type = "CONFIRMED_FRAUD"
        else:
            status = "FALSE_POSITIVE"
            resolution_type = "FALSE_POSITIVE"
    
    # Create item matching Lambda handler output
    item = {
        "transaction_id": tx_id,
        "amount": str(amount),  # Lambda stores as string
        "merchant_nif": merchant_nif,
        "category": category,
        "timestamp": timestamp.isoformat(),
        "ip_address": ip_address,
        "merchant_country": random.choice(MERCHANT_COUNTRIES),
        "previous_avg_amount": str(round(random.uniform(50, 500), 2)),
        "hour_of_day": timestamp.hour,
        "day_of_week": timestamp.weekday(),
        "transactions_last_10min": random.randint(0, 10),
        "anomaly_score": str(anomaly_score),
        "status": status,
        "processed_at": (timestamp + timedelta(seconds=random.randint(1, 30))).isoformat(),
    }
    
    # Add TTL for NORMAL transactions
    if status == "NORMAL":
        ttl = int((timestamp + timedelta(days=7)).timestamp())
        item["ttl"] = ttl
    
    return item


def seed_transactions(count: int = 100):
    """Seed DynamoDB with test transactions."""
    print(f"Seeding {count} transactions to DynamoDB table '{TABLE_NAME}'...")
    
    # Initialize DynamoDB
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    table = dynamodb.Table(TABLE_NAME)
    
    # Verify table exists
    try:
        table.table_status
        print(f"✓ Connected to DynamoDB table: {TABLE_NAME}")
    except Exception as e:
        print(f"✗ Error connecting to DynamoDB: {e}")
        print(f"  Make sure AWS credentials are configured and table '{TABLE_NAME}' exists.")
        return False
    
    # Generate and insert transactions with spread over last 24 hours
    with table.batch_writer() as batch:
        for i in range(count):
            # Spread transactions over last 24 hours
            hours_ago = random.uniform(0, 24)
            item = generate_transaction(i, hours_ago)
            batch.put_item(Item=item)
            
            if (i + 1) % 50 == 0:
                print(f"  Inserted {i + 1}/{count} transactions...")
    
    print(f"✓ Successfully seeded {count} transactions!")
    
    # Print summary
    print("\nTransaction distribution:")
    print(f"  - Total transactions: {count}")
    
    # Quick scan to verify
    response = table.scan(
        ProjectionExpression="#s",
        ExpressionAttributeNames={"#s": "status"},
        Select="COUNT"
    )
    
    statuses = {}
    for item in table.scan(Select="ALL_ATTRIBUTES", 
                           ProjectionExpression="#s, anomaly_score",
                           ExpressionAttributeNames={"#s": "status"}).get("Items", []):
        status = item.get("status", "UNKNOWN")
        statuses[status] = statuses.get(status, 0) + 1
    
    for status, count in sorted(statuses.items()):
        print(f"  - {status}: {count}")
    
    return True


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed DynamoDB with test transactions")
    parser.add_argument("-c", "--count", type=int, default=100, help="Number of transactions to generate")
    args = parser.parse_args()
    
    success = seed_transactions(args.count)
    
    if not success:
        print("\nTo fix DynamoDB access:")
        print("1. Ensure AWS credentials are configured: aws configure")
        print("2. Verify DynamoDB table exists or create it")
        print("3. Check AWS_REGION environment variable matches your table region")
