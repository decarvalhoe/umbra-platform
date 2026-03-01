#!/bin/bash
set -euo pipefail

echo "🛑 Arrêt de l'environnement de production"
docker-compose -f docker-compose/production.yml down
echo "✅ Environnement de production arrêté"
