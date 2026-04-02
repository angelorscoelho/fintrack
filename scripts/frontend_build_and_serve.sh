#!/usr/bin/env bash
set -euo pipefail

PORT=${1:-5173}
INSTALL=${2:-false}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../frontend" || exit 1

if [ "$INSTALL" = "true" ] || [ "$INSTALL" = "install" ]; then
  echo "Running npm install..."
  npm install
fi

echo "Building frontend..."
npm run build

echo "Starting preview server on port $PORT (background)..."
nohup npm run preview -- --port "$PORT" > /dev/null 2>&1 &
disown || true

echo "Preview started at http://localhost:$PORT/poc/fintrack/"
