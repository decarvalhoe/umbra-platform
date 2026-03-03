#!/usr/bin/env bash
# -------------------------------------------------------------------
# init-secrets.sh — Populate Vault with secrets from .env file
#
# Usage:
#   ./init-secrets.sh [ENV_FILE]
#
# Defaults to ../../.env.example if no file is provided.
# Requires VAULT_ADDR and VAULT_TOKEN environment variables.
# -------------------------------------------------------------------
set -euo pipefail

ENV_FILE="${1:-../../.env.example}"
VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-umbra-dev-token}"

if ! command -v vault &>/dev/null; then
  echo "ERROR: vault CLI not found. Install from https://developer.hashicorp.com/vault/install"
  exit 1
fi

export VAULT_ADDR VAULT_TOKEN

echo "==> Waiting for Vault to be ready..."
for i in $(seq 1 30); do
  if vault status &>/dev/null; then
    break
  fi
  sleep 1
done

if ! vault status &>/dev/null; then
  echo "ERROR: Vault is not available at $VAULT_ADDR"
  exit 1
fi

echo "==> Enabling KV v2 secrets engine (if not already enabled)..."
vault secrets enable -path=secret -version=2 kv 2>/dev/null || true

echo "==> Writing Umbra service policy..."
vault policy write umbra-service "$(dirname "$0")/policy.hcl"

echo "==> Reading secrets from $ENV_FILE ..."
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

# Mapping of env var names to Vault paths
declare -A SERVICE_MAP=(
  # AI Director
  [OPENAI_API_KEY]="ai-director"
  [ANTHROPIC_API_KEY]="ai-director"
  [LLM_PROVIDER]="ai-director"
  [LLM_MODEL]="ai-director"

  # Payment
  [STRIPE_SECRET_KEY]="payment"
  [STRIPE_WEBHOOK_SECRET]="payment"
  [PAYMENT_DATABASE_URL]="payment"
  [FRONTEND_URL]="payment"
  [BATTLEPASS_SEASON_WEEKS]="payment"

  # Shared
  [REDIS_URL]="shared"
  [LOG_LEVEL]="shared"
  [CELERY_BROKER_URL]="shared"
  [CELERY_RESULT_BACKEND]="shared"
  [NAKAMA_SERVER_KEY]="shared"
)

# Collect secrets per service path
declare -A AI_DIRECTOR_SECRETS
declare -A PAYMENT_SECRETS
declare -A SHARED_SECRETS

while IFS= read -r line; do
  # Skip comments and empty lines
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// /}" ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  service="${SERVICE_MAP[$key]:-}"
  if [ -z "$service" ]; then
    echo "    SKIP: $key (no mapping)"
    continue
  fi

  case "$service" in
    ai-director) AI_DIRECTOR_SECRETS["$key"]="$value" ;;
    payment)     PAYMENT_SECRETS["$key"]="$value" ;;
    shared)      SHARED_SECRETS["$key"]="$value" ;;
  esac
done < "$ENV_FILE"

# Write secrets to Vault as KV v2
write_secrets() {
  local path="$1"
  shift
  local -n secrets_ref=$1

  if [ ${#secrets_ref[@]} -eq 0 ]; then
    echo "    No secrets for $path"
    return
  fi

  local args=""
  for key in "${!secrets_ref[@]}"; do
    args="$args ${key}=${secrets_ref[$key]}"
  done

  echo "==> Writing ${#secrets_ref[@]} secrets to secret/umbra/$path"
  vault kv put "secret/umbra/$path" $args
}

write_secrets "ai-director" AI_DIRECTOR_SECRETS
write_secrets "payment" PAYMENT_SECRETS
write_secrets "shared" SHARED_SECRETS

echo ""
echo "==> Done. Verify with:"
echo "    vault kv list secret/umbra/"
echo "    vault kv get secret/umbra/ai-director"
echo "    vault kv get secret/umbra/payment"
echo "    vault kv get secret/umbra/shared"
