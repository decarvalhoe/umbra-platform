#!/bin/bash
set -euo pipefail

echo "🚀 Démarrage de l'environnement de staging Project Umbra"
docker-compose -f docker-compose/staging.yml up -d
echo "✅ Environnement de staging démarré"
echo "🌐 API Gateway (staging): http://localhost:8080"
echo "📊 Monitoring (staging): http://localhost:9090 | http://localhost:3001"
