"""DynamoDB client wrapper. Implemented in Session S07E."""
import boto3
import os

_table = None


def init_dynamo_client():
    """Initialize DynamoDB table resource. Call from FastAPI lifespan."""
    global _table
    dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "eu-west-1"))
    _table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE", "transactions"))


def get_table():
    return _table
