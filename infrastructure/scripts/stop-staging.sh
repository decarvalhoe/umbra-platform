#!/bin/bash
set -euo pipefail

echo "🛑 Arrêt de l'environnement de staging"
docker-compose -f docker-compose/staging.yml down
echo "✅ Environnement de staging arrêté"
