# Guide de Déploiement - Project Umbra

## Pré-requis
- Accès au repo `umbra-infrastructure`.
- Docker et docker-compose installés.
- Accès aux secrets GitHub Actions (production/staging).

## Environnements
| Environnement | Branche | Automatisation |
| ------------- | ------- | -------------- |
| Development | feature/* | Déploiement local via Docker Compose |
| Staging | develop | Pipeline CI `deploy-staging` |
| Production | main | Pipeline CI `deploy-production` avec approbation manuelle |

## Déploiement local
```bash
git clone https://github.com/decarvalhoe/umbra-infrastructure.git
cd umbra-infrastructure
make bootstrap
make up
```
- API Gateway exposée sur `http://localhost:8080`.
- Interface de monitoring sur `http://localhost:9090` (Prometheus) et `http://localhost:3001` (Grafana).

## Déploiement Staging/Production
1. Merge vers la branche cible (`develop` ou `main`).
2. GitHub Actions déclenche le workflow correspondant.
3. Validation manuelle pour production.
4. Sur Kubernetes :
   - Rolling update avec `maxUnavailable=1`.
   - Vérification des probes `liveness` et `readiness`.
5. Post-déploiement :
   - Vérifier les dashboards Grafana.
   - Passer les tests fumée via `make smoke-tests`.

## Rollback
- `kubectl rollout undo deployment/<service>` pour revenir à la version précédente.
- Restaurer les bases via snapshots automatiques (RPO 15 minutes).
