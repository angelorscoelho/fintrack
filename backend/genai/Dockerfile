FROM python:3.12-slim

WORKDIR /app

# Install GenAI-specific dependencies first for better layer caching
COPY backend/genai/requirements.txt /tmp/genai-requirements.txt
RUN pip install --no-cache-dir -r /tmp/genai-requirements.txt

# Copy only the packages required by the GenAI service:
#   - backend/genai/  (service code)
#   - backend/__init__.py  (package marker for absolute imports)
#   - shared/  (project constants)
COPY backend/__init__.py backend/__init__.py
COPY backend/genai/ backend/genai/
COPY shared/ shared/

# Set PYTHONPATH so absolute imports (backend.genai.*, shared.*) resolve
ENV PYTHONPATH=/app

# Railway assigns $PORT dynamically; default to 8001 for local dev
ENV PORT=8001

EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn backend.genai.main:app --host 0.0.0.0 --port ${PORT}"]
