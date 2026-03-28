"""
FinTrack AI — DynamoDB Data Population Script
Loads synthetic transaction data into AWS DynamoDB for testing.

Usage:
    python populate_dynamodb.py                    # Uses generated synthetic data
    python populate_dynamodb.py --file data.json   # Uses custom JSON file
    python populate_dynamodb.py --generate 1000    # Generate + load
"""
import argparse
import json
import os
import sys
import uuid
import random
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
_DATA_DIR = Path(__file__).resolve().parent
if str(_DATA_DIR) not in sys.path:
    sys.path.insert(0, str(_DATA_DIR))
from banking_fields import attach_banking_fields  # noqa: E402

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    print("ERROR: boto3 not installed. Run: pip install boto3")
    sys.exit(1)


# Environment configuration
DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "transactions")
AWS_REGION = os.environ.get("AWS_REGION", "eu-west-1")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
ENDPOINT_URL = os.environ.get("DYNAMODB_ENDPOINT_URL")  # For local development

# Synthetic data generators (simplified version of generator.py)
CATEGORIES = [
    "fuel", "restaurant", "travel", "technology_services",
    "medical", "consulting", "retail", "utilities",
]

CATEGORY_PARAMS = {
    "fuel": (80.0, 30.0),
    "restaurant": (45.0, 20.0),
    "travel": (350.0, 150.0),
    "technology_services": (250.0, 100.0),
    "medical": (120.0, 60.0),
    "consulting": (800.0, 300.0),
    "retail": (60.0, 40.0),
    "utilities": (90.0, 35.0),
}

COUNTRY_WEIGHTS = {
    "PT": 0.75, "ES": 0.08, "FR": 0.05, "DE": 0.04,
    "GB": 0.03, "US": 0.02, "CN": 0.01, "BR": 0.01, "OTHER": 0.01,
}


def generate_synthetic_transactions(n=1000):
    """Generate n synthetic transactions with fraud patterns."""
    records = []
    countries = list(COUNTRY_WEIGHTS.keys())
    country_probs = list(COUNTRY_WEIGHTS.values())
    
    # Anomaly distribution (30% fraud)
    num_anomalies = int(n * 0.30)
    num_normal = n - num_anomalies
    
    for i in range(n):
        is_anomaly = i < num_anomalies
        category = random.choice(CATEGORIES)
        mean, std = CATEGORY_PARAMS[category]
        
        # Base transaction
        prev_avg = max(5.0, random.gauss(mean, std * 0.5))
        amount = max(1.0, random.gauss(mean, std))
        
        # Timestamp within last 7 days
        days_back = random.randint(0, 7)
        hours_back = random.randint(0, 23)
        timestamp = datetime.now(timezone.utc) - timedelta(days=days_back, hours=hours_back)
        
        record = {
            "transaction_id": str(uuid.uuid4()),
            "timestamp": timestamp.isoformat(),
            "merchant_nif": "PT" + "".join([str(random.randint(0, 9)) for _ in range(9)]),
            "merchant_name": f"Merchant {random.randint(1000, 9999)}",
            "amount": round(amount, 2),
            "category": category,
            "merchant_country": random.choices(countries, weights=country_probs)[0],
            "previous_avg_amount": round(prev_avg, 2),
            "hour_of_day": timestamp.hour,
            "day_of_week": timestamp.weekday(),
            "transactions_last_10min": random.randint(0, 5),
        }
        
        if is_anomaly:
            # Add fraud indicators
            anomaly_type = random.choice(["velocity_fraud", "amount_spike", "geo_hopping", "invoice_manipulation"])
            
            if anomaly_type == "velocity_fraud":
                record["transactions_last_10min"] = random.randint(16, 40)
                record["amount"] = round(prev_avg * random.uniform(2.5, 4.0), 2)
                record["anomaly_score"] = round(random.uniform(0.70, 0.95), 3)
            elif anomaly_type == "amount_spike":
                record["amount"] = round(prev_avg * random.uniform(5.0, 12.0), 2)
                record["anomaly_score"] = round(random.uniform(0.75, 0.98), 3)
            elif anomaly_type == "geo_hopping":
                record["merchant_country"] = random.choice([c for c in countries if c != "PT"])
                record["hour_of_day"] = random.randint(1, 4)
                record["anomaly_score"] = round(random.uniform(0.60, 0.85), 3)
            else:  # invoice_manipulation
                record["category"] = "consulting"
                record["amount"] = float(random.choice([9000, 10000, 15000, 20000]))
                record["anomaly_score"] = round(random.uniform(0.65, 0.90), 3)
            
            record["status"] = random.choice(["PENDING_REVIEW", "PENDING_REVIEW", "PENDING_REVIEW", "RESOLVED"])
            record["anomaly_type"] = anomaly_type
        else:
            record["anomaly_score"] = round(random.uniform(0.0, 0.40), 3)
            record["status"] = "NORMAL"
            record["anomaly_type"] = "normal"

        record["ip_address"] = f"{random.randint(1,254)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
        attach_banking_fields(record)

        # Add processing metadata
        record["processing_status"] = "xai_complete"
        record["processed_at"] = timestamp.isoformat()
        
        # Add AI explanation for anomalies
        if is_anomaly:
            record["ai_explanation"] = json.dumps({
                "pattern_detected": anomaly_type,
                "confidence": record["anomaly_score"],
                "risk_factors": [
                    f"Amount {record['amount']:.2f} vs avg {record['previous_avg_amount']:.2f}",
                    f"Country: {record['merchant_country']}",
                    f"Category: {category}",
                ]
            })
        
        records.append(record)
    
    return records


def get_dynamodb_client():
    """Create DynamoDB client with credentials from environment."""
    kwargs = {
        "region_name": AWS_REGION,
    }
    
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = AWS_SECRET_ACCESS_KEY
    
    if ENDPOINT_URL:
        kwargs["endpoint_url"] = ENDPOINT_URL
    
    return boto3.resource("dynamodb", **kwargs)


def load_transactions_to_dynamodb(transactions, table_name=None):
    """Load transactions into DynamoDB table."""
    table_name = table_name or DYNAMODB_TABLE
    
    try:
        dynamodb = get_dynamodb_client()
        table = dynamodb.Table(table_name)
        
        # Check table exists
        try:
            table.table_status()
        except ClientError as e:
            print(f"ERROR: Table '{table_name}' not found or not accessible")
            print(f"Details: {e}")
            return 0
        
        print(f"Loading {len(transactions)} transactions into DynamoDB table '{table_name}'...")
        
        # Batch write in groups of 25 (DynamoDB limit)
        batch_size = 25
        total_loaded = 0
        
        with table.batch_writer() as batch:
            for i, transaction in enumerate(transactions):
                # Add processed_at if missing
                if "processed_at" not in transaction:
                    transaction["processed_at"] = transaction["timestamp"]
                
                batch.put_item(Item=transaction)
                total_loaded += 1
                
                if (i + 1) % 100 == 0:
                    print(f"  Progress: {i + 1}/{len(transactions)} items loaded...")
        
        print(f"✓ Successfully loaded {total_loaded} transactions")
        return total_loaded
        
    except NoCredentialsError:
        print("ERROR: AWS credentials not configured")
        print("Set environment variables:")
        print("  AWS_ACCESS_KEY_ID")
        print("  AWS_SECRET_ACCESS_KEY")
        print("  AWS_REGION")
        return 0
    except ClientError as e:
        print(f"ERROR: DynamoDB error: {e}")
        return 0


def main():
    parser = argparse.ArgumentParser(description="Populate DynamoDB with synthetic transactions")
    parser.add_argument("--n", type=int, default=1000, help="Number of transactions to generate")
    parser.add_argument("--file", type=str, help="Load from JSON file instead of generating")
    parser.add_argument("--table", type=str, default=DYNAMODB_TABLE, help="DynamoDB table name")
    parser.add_argument("--dry-run", action="store_true", help="Generate data but don't load")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("FinTrack AI — DynamoDB Data Population")
    print("=" * 60)
    
    # Load or generate transactions
    if args.file:
        print(f"Loading transactions from: {args.file}")
        with open(args.file, "r") as f:
            transactions = json.load(f)
        print(f"Loaded {len(transactions)} transactions from file")
    else:
        print(f"Generating {args.n} synthetic transactions...")
        transactions = generate_synthetic_transactions(args.n)
        print(f"Generated {len(transactions)} transactions")
        
        # Save to file for reference
        output_file = Path(__file__).parent / "synthetic_transactions.json"
        with open(output_file, "w") as f:
            json.dump(transactions, f, indent=2)
        print(f"Saved to: {output_file}")
    
    if args.dry_run:
        print("\n[DRY RUN] Skipping DynamoDB load")
        print(f"Would load {len(transactions)} transactions")
        return
    
    # Load into DynamoDB
    print(f"\nConnecting to DynamoDB...")
    print(f"  Region: {AWS_REGION}")
    print(f"  Table: {args.table}")
    print(f"  Endpoint: {ENDPOINT_URL or 'AWS Default'}")
    
    loaded = load_transactions_to_dynamodb(transactions, args.table)
    
    if loaded > 0:
        print("\n" + "=" * 60)
        print("✓ SUCCESS: DynamoDB populated")
        print("=" * 60)
        print("\nDashboard should now show data!")
        print("\nNext steps:")
        print("  1. Query /api/stats to verify data")
        print("  2. Check dashboard at http://localhost:3000")
    else:
        print("\n" + "=" * 60)
        print("✗ FAILED: Could not load data to DynamoDB")
        print("=" * 60)
        print("\nTroubleshooting:")
        print("  1. Check AWS credentials are set")
        print("  2. Verify DynamoDB table exists")
        print("  3. Check network connectivity to AWS")


if __name__ == "__main__":
    main()
