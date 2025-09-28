#!/bin/bash
set -euo pipefail

echo "🛑 Arrêt de l'environnement de développement"
docker-compose -f docker-compose/development.yml down
echo "✅ Environnement arrêté"
