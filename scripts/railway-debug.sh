#!/usr/bin/env bash
# Run Railway CLI diagnostics from repo root. Do NOT paste tokens in chat.
# Docs: https://docs.railway.com/reference/cli-api
#
# Account / workspace operations (whoami, list):
#   export RAILWAY_API_TOKEN="..."   # Account → Tokens → create token (account-level; see note below)
#
# Project-only token (deploy, often after `railway link`):
#   export RAILWAY_TOKEN="..."
#
# Then: bash scripts/railway-debug.sh
# First time: npx @railway/cli link

set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLI=(npx --yes @railway/cli@latest)

if [[ -z "${RAILWAY_TOKEN:-}" && -z "${RAILWAY_API_TOKEN:-}" ]]; then
  echo "ERROR: Set RAILWAY_API_TOKEN (account) or RAILWAY_TOKEN (project) in your environment."
  exit 1
fi

# Non-secret diagnostics
echo "=== Auth env (length only) ==="
[[ -n "${RAILWAY_API_TOKEN:-}" ]] && echo "RAILWAY_API_TOKEN length: ${#RAILWAY_API_TOKEN}"
[[ -n "${RAILWAY_TOKEN:-}" ]] && echo "RAILWAY_TOKEN length: ${#RAILWAY_TOKEN}"
echo ""

# whoami / list need an account token. Project tokens often fail here (by design).
if [[ -n "${RAILWAY_API_TOKEN:-}" ]]; then
  echo "=== railway whoami (requires valid account RAILWAY_API_TOKEN) ==="
  if ! "${CLI[@]}" whoami; then
    echo ""
    echo "FIX: whoami failed. Common causes:"
    echo "  1) Token revoked or typo — create a new token: Railway dashboard → Account → Tokens."
    echo "  2) Wrong token type — use an account/workspace token as RAILWAY_API_TOKEN (not a project deploy token)."
    echo "  3) Extra characters — no quotes/spaces/newlines when exporting; re-copy the token."
    echo "  4) Or skip tokens: run 'npx @railway/cli login' once in this terminal."
    echo ""
  fi
  echo "=== railway list ==="
  "${CLI[@]}" list || true
elif [[ -n "${RAILWAY_TOKEN:-}" ]]; then
  echo "=== Skipping whoami / list ==="
  echo "You only have RAILWAY_TOKEN (project scope). whoami and list need RAILWAY_API_TOKEN."
  echo "Create an account token (Railway → Account → Tokens) and: export RAILWAY_API_TOKEN=..."
  echo ""
fi

if [[ -d .railway ]]; then
  echo "=== railway status (linked project) ==="
  "${CLI[@]}" status || true
  echo ""
  echo "=== railway logs (last 80 lines) ==="
  "${CLI[@]}" logs -n 80 2>&1 || echo "Try: npx @railway/cli logs -s <service-name> -n 80"
else
  echo "=== No .railway/ link ==="
  echo "From $ROOT run: npx @railway/cli link"
fi
