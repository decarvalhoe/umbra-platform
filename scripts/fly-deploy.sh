#!/bin/bash
# Deploy all Umbra services to Fly.io in correct order.
# Stateless services first, then services requiring migrations.
#
# Usage: ./scripts/fly-deploy.sh [--skip-health]

set -euo pipefail

SKIP_HEALTH=${1:-""}
DEPLOY_FAILED=0

deploy_service() {
  local name=$1
  local dir=$2
  echo ""
  echo "=== Deploying $name ==="
  if (cd "$dir" && flyctl deploy --now 2>&1); then
    echo "[OK] $name deployed successfully"
  else
    echo "[FAIL] $name deployment failed!"
    DEPLOY_FAILED=1
    return 1
  fi
}

health_check() {
  local name=$1
  local url=$2
  echo -n "  $name: "
  if curl -sf "$url" -o /dev/null --max-time 10; then
    echo "OK"
  else
    echo "FAIL"
    return 1
  fi
}

echo "=== Fly.io Deployment — Umbra Platform ==="
echo "Deploying to region: cdg (Paris)"

# Phase 1: Stateless services (parallel-safe but sequential for clarity)
deploy_service "umbra-client" "client"
deploy_service "umbra-game-logic" "services/game-logic"
deploy_service "umbra-ai-director" "services/ai-director"

# Phase 2: Services requiring database migrations
deploy_service "umbra-payment" "services/payment"

# Phase 3: Health checks
if [ "$SKIP_HEALTH" != "--skip-health" ]; then
  echo ""
  echo "=== Health Checks ==="
  sleep 5  # Wait for services to stabilize
  health_check "Client" "https://umbra-client.fly.dev/"
  health_check "Game Logic" "https://umbra-game-logic.fly.dev/health"
  health_check "AI Director" "https://umbra-ai-director.fly.dev/health"
  health_check "Payment" "https://umbra-payment.fly.dev/health"
fi

echo ""
if [ $DEPLOY_FAILED -eq 0 ]; then
  echo "=== All deployments successful ==="
else
  echo "=== Some deployments failed — check logs above ==="
  echo "  Rollback: flyctl releases -a <app-name> && flyctl deploy -a <app-name> --image <previous-image>"
  exit 1
fi
