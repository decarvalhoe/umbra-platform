# Guide de Développement - Project Umbra

## 🏗️ Architecture Multi-Repo

Project Umbra utilise une architecture microservices avec des repositories séparés pour chaque service.

### Avantages
- **Isolation** : Pas de conflits de merge entre services
- **Scalabilité** : Équipes spécialisées par service
- **Déploiement** : Releases indépendantes
- **Maintenance** : Dépendances isolées

## 🚀 Démarrage Rapide

### Prérequis
- Docker 24.0+
- Node.js 18+ (pour le client)
- Python 3.11+ (pour les services)
- GitHub CLI (pour la création de repos)

### Environnement de Développement
```bash
# Cloner l'infrastructure
git clone https://github.com/decarvalhoe/umbra-infrastructure.git
cd umbra-infrastructure

# Démarrer tous les services
./scripts/start-dev.sh

# Vérifier que tout fonctionne
curl http://localhost:8080/health
```

## 🔧 Workflow de Développement

### 1. Choisir un Service
Chaque service a sa propre responsabilité :
- **auth-service** : Authentification et sécurité
- **player-service** : Profils et données joueurs
- **game-state-service** : État de jeu et progression
- **payment-service** : Monétisation et gacha
- **cloud-profile-service** : Synchronisation cross-platform
- **security-service** : Anti-triche et protection
- **localization-service** : Traductions et i18n

### 2. Créer une Issue
Utiliser les templates GitHub optimisés pour Codex :
- Description claire de l'objectif
- User story contextuelle
- Critères d'acceptation détaillés
- Spécifications techniques
- Scénarios de test

### 3. Développer
```bash
# Cloner le service
git clone https://github.com/decarvalhoe/umbra-[SERVICE]-service.git
cd umbra-[SERVICE]-service

# Installer les dépendances
make install

# Lancer en mode développement
make dev

# Lancer les tests
make test-cov
```

### 4. Standards de Qualité
- **Code** : Conforme flake8 et black (Python) / ESLint (TypeScript)
- **Tests** : Couverture >80%
- **Documentation** : README et docstrings à jour
- **CI/CD** : Tous les checks verts

## 🧪 Tests

### Backend (Python)
```bash
# Tests unitaires
pytest tests/ -v

# Avec couverture
pytest tests/ -v --cov=src --cov-report=term-missing

# Tests d'intégration
pytest tests/integration/ -v
```

### Frontend (TypeScript)
```bash
# Tests unitaires
npm test

# Tests en mode watch
npm run test:watch

# Tests end-to-end
npm run test:e2e
```

## 🚀 Déploiement

### Environnements
- **Development** : Local avec Docker Compose
- **Staging** : GitHub Actions → Cloud staging
- **Production** : GitHub Actions → Cloud production

### Process de Release
1. Merge vers `develop` → Déploiement staging automatique
2. Tests de validation en staging
3. Merge vers `main` → Déploiement production automatique
4. Tag de version automatique

## 🔒 Sécurité

### Standards
- Validation stricte des entrées
- Authentification JWT avec refresh tokens
- Rate limiting sur tous les endpoints
- Logs de sécurité pour les actions sensibles
- Pas de secrets dans le code

### Anti-Triche
- Validation côté serveur de toutes les actions
- Détection d'anomalies comportementales
- Système de réputation
- Sanctions automatiques

## 📊 Monitoring

### Métriques
- Santé des services (`/health`)
- Métriques Prometheus (`/metrics`)
- Logs structurés JSON
- Alertes automatiques

### Dashboards
- Vue d'ensemble des services
- Performance par endpoint
- Erreurs et exceptions
- Utilisation des ressources

## 🤖 Travail avec Codex

### Templates Optimisés
- Issues structurées avec critères d'acceptation
- Pull Requests avec checklist complète
- Documentation générée automatiquement

### Workflow Recommandé
1. Créer une issue avec le template Codex
2. Assigner à Codex avec les spécifications complètes
3. Codex développe, teste et crée la PR
4. Review et merge par l'équipe

## 📚 Ressources

### Documentation
- [Standards API](../api/standards.md)
- [Game Design Document](../game-design/game-design-document.md)
- [Architecture Services](../architecture/services-architecture.md)

### Outils
- [GitHub CLI](https://cli.github.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [VS Code Extensions](https://code.visualstudio.com/)

---

**Happy Coding! 🚀**
