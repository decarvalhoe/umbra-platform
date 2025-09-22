#!/bin/bash
echo "🚀 Démarrage de l'environnement de développement Project Umbra"
docker-compose -f docker-compose/development.yml up -d
echo "✅ Environnement démarré"
echo "🌐 API Gateway: http://localhost:8080"
echo "🎮 Client de jeu: http://localhost:3000"
echo "📊 Monitoring: http://localhost:9090 (Prometheus) | http://localhost:3001 (Grafana)"
