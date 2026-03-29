FROM python:3.12-slim

WORKDIR /app

# Install dependencies (root requirements.txt, build context = repo root)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the API package (backend/api → /app/api) so that
# absolute imports like "from api.db.dynamo import ..." resolve correctly
COPY backend/api/ api/

# Railway assigns $PORT dynamically; default to 8000 for local dev
ENV PORT=8000

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
