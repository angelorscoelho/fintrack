"""App configuration via pydantic-settings."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    dynamodb_table: str = os.environ.get("DYNAMODB_TABLE", "transactions")
    aws_region: str = os.environ.get("AWS_REGION", "eu-west-1")
    gemini_api_key: str = os.environ.get("GEMINI_API_KEY", "")
    genai_service_url: str = os.environ.get("GENAI_SERVICE_URL", "http://localhost:8001")

    class Config:
        env_file = ".env"


settings = Settings()
