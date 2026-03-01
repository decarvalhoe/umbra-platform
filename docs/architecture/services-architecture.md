# Architecture des Services - Project Umbra

## Vue d'ensemble
Project Umbra repose sur une architecture microservices orchestrée autour d'une passerelle d'API. Chaque service est isolé, déployable indépendamment et communique via HTTP et événements asynchrones.

## Services principaux
- **API Gateway** : Nginx assure le routage, l'authentification initiale et les quotas.
- **Auth Service** : Gestion des identités, sessions et politiques de sécurité.
- **Player Service** : Profils, progression persistée et inventaires hors run.
- **Game State Service** : Synchronisation des sessions de jeu en temps réel et stockage des runs.
- **Payment Service** : Monétisation, boutique in-game et intégrations tierces.
- **Cloud Profile Service** : Sauvegardes cross-platform et synchronisation multi-appareils.
- **Security Service** : Anti-triche, scoring de réputation et télémétrie suspecte.
- **Localization Service** : Fichiers de traduction, détection de locale et fallback par région.

## Communication
- **Synchrone** : REST JSON standardisé selon [les standards API](../api/standards.md).
- **Asynchrone** : Bus d'événements (Kafka) pour les notifications de progression, achats et alertes sécurité.
- **Stockage partagé** : PostgreSQL par service, Redis pour les caches et files de travail.

## Observabilité
- **Logs** : Centralisés via ELK, corrélation par `trace_id`.
- **Metrics** : Prometheus scrape chaque service, dashboards Grafana par domaine.
- **Alerting** : Alertmanager déclenche les incidents sur disponibilité, latence et erreurs 5xx.

## Déploiement
- Conteneurs Docker versionnés, orchestrés par Kubernetes.
- Pipelines GitHub Actions pour build/test/deploy vers staging et production.
- Feature flags via LaunchDarkly pour les rollouts progressifs.
