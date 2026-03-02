#!/bin/bash
# Provisions managed Postgres and Redis on Fly.io and configures secrets.
# Run once after creating apps with: flyctl apps create umbra-{client,game-logic,ai-director,payment}
#
# Prerequisites: flyctl authenticated (flyctl auth login)
# Usage: ./scripts/fly-setup.sh

set -euo pipefail

echo "=== Fly.io Umbra Platform Setup ==="

# 1. Create managed Postgres for payment service
echo ""
echo "--- Creating Postgres cluster ---"
flyctl postgres create \
  --name umbra-postgres \
  --region cdg \
  --vm-size shared-cpu-1x \
  --initial-cluster-size 1 \
  --volume-size 1 \
  || echo "Postgres cluster may already exist, continuing..."

# 2. Attach Postgres to payment app (auto-sets DATABASE_URL secret)
echo ""
echo "--- Attaching Postgres to umbra-payment ---"
flyctl postgres attach umbra-postgres --app umbra-payment \
  || echo "Already attached or error, continuing..."

# 3. Create Upstash Redis for AI Director and Game Logic
echo ""
echo "--- Creating Redis (Upstash) ---"
REDIS_OUTPUT=$(flyctl redis create \
  --name umbra-redis \
  --region cdg \
  --plan free \
  --no-replicas \
  2>&1) || echo "Redis may already exist, continuing..."
echo "$REDIS_OUTPUT"

# Extract Redis URL if available
REDIS_URL=$(echo "$REDIS_OUTPUT" | grep -oP 'redis://\S+' || echo "")
if [ -z "$REDIS_URL" ]; then
  echo "WARNING: Could not extract REDIS_URL. Set it manually:"
  echo "  flyctl secrets set -a umbra-ai-director REDIS_URL=redis://..."
  echo "  flyctl secrets set -a umbra-game-logic REDIS_URL=redis://..."
fi

# 4. Set secrets for AI Director
echo ""
echo "--- Setting AI Director secrets ---"
flyctl secrets set -a umbra-ai-director \
  LOG_LEVEL=info \
  ${REDIS_URL:+REDIS_URL=$REDIS_URL}

# 5. Set secrets for Game Logic
echo ""
echo "--- Setting Game Logic secrets ---"
flyctl secrets set -a umbra-game-logic \
  LOG_LEVEL=info \
  ${REDIS_URL:+REDIS_URL=$REDIS_URL}

# 6. Set secrets for Payment (DATABASE_URL auto-set by postgres attach)
echo ""
echo "--- Setting Payment secrets ---"
flyctl secrets set -a umbra-payment \
  STRIPE_SECRET_KEY=sk_test_placeholder \
  STRIPE_WEBHOOK_SECRET=whsec_placeholder \
  LOG_LEVEL=info

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Replace placeholder Stripe keys with real test keys"
echo "  2. If REDIS_URL wasn't auto-detected, set it manually for ai-director and game-logic"
echo "  3. Deploy services: ./scripts/fly-deploy.sh"
