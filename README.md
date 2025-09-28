# Umbra Infrastructure

Infrastructure et orchestration pour Project Umbra - Gestion centralisée de tous les services.

## 🏗️ Architecture

### Services Backend
- **umbra-auth-service** (5000) - Authentification
- **umbra-player-service** (5001) - Gestion des joueurs
- **umbra-game-state-service** (5002) - État de jeu
- **umbra-payment-service** (5003) - Paiements et gacha
- **umbra-cloud-profile-service** (5004) - Profils cloud
- **umbra-security-service** (5006) - Sécurité
- **umbra-localization-service** (5007) - Localisation

### Client
- **umbra-game-client** (3000) - Client React + Phaser

### Infrastructure
- **PostgreSQL** (5432) - Base de données
- **Redis** (6379) - Cache et sessions
- **Nginx** (8080) - API Gateway
- **Prometheus** (9090) - Monitoring
- **Grafana** (3001) - Dashboards

## 🚀 Démarrage Rapide

### Environnement de Développement
```bash
# Démarrer tous les services (développement)
./scripts/start-dev.sh

# Arrêter tous les services (développement)
./scripts/stop-dev.sh

# Démarrer l'environnement de staging
./scripts/start-staging.sh

# Arrêter l'environnement de staging
./scripts/stop-staging.sh

# Démarrer l'environnement de production
./scripts/start-production.sh

# Arrêter l'environnement de production
./scripts/stop-production.sh
```

### Accès aux Services
- **API Gateway:** http://localhost:8080
- **Client de jeu:** http://localhost:3000
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3001 (admin/admin)

## 🔧 Configuration

### Variables d'Environnement
Chaque service utilise ses propres variables d'environnement définies dans le docker-compose.

- **Staging :** les URLs de base de données par défaut utilisent les mêmes identifiants que l'environnement de développement (`dev_password`). Surcharger les variables `*_DATABASE_URL`/`*_REDIS_URL` si nécessaire.
- **Production :** toutes les variables critiques doivent être fournies via l'environnement (`docker-compose/production.yml` refuse de démarrer si elles manquent). Provisionner la base de données en amont ou adapter le script d'initialisation selon vos besoins.

### Base de Données
Les bases de données sont automatiquement créées au démarrage via le script `init-databases.sql`.

## 📊 Monitoring

### Métriques Disponibles
- Santé des services
- Temps de réponse
- Nombre de requêtes
- Erreurs par service

### Dashboards Grafana
- Vue d'ensemble des services
- Performance par endpoint
- Utilisation des ressources

## 🚀 Déploiement

### Environnements
- **Development:** `docker-compose/development.yml`
- **Staging:** `docker-compose/staging.yml`
- **Production:** `docker-compose/production.yml`

Chaque environnement dispose d'un script dédié dans `scripts/` pour faciliter le démarrage et l'arrêt.

## 🤝 Contribution

1. Modifier la configuration dans le bon environnement
2. Tester localement
3. Créer une Pull Request
4. Mettre à jour `GIT_ISSUES.md` pour refléter l'état des issues locales

## 📄 Licence

MIT License - voir [LICENSE](LICENSE)
