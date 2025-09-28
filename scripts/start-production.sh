#!/bin/bash
set -euo pipefail

echo "🚀 Démarrage de l'environnement de production Project Umbra"
docker-compose -f docker-compose/production.yml up -d
echo "✅ Environnement de production démarré"
echo "🌐 API Gateway (production): http://localhost:8080"
echo "📊 Monitoring (production): http://localhost:9090 | http://localhost:3001"
