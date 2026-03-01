# Game State Service - Documentation API

## Vue d'ensemble
Orchestre l'état temps réel des runs, l'instance de session et la synchronisation coop.

## Endpoints principaux
- `POST /api/game-state/sessions` : Création d'une session de run.
- `GET /api/game-state/sessions/:session_id` : Détails d'une session.
- `POST /api/game-state/sessions/:session_id/events` : Injection d'événements gameplay.
- `GET /api/game-state/sessions/:session_id/snapshot` : Snapshot complet pour resync.
- `DELETE /api/game-state/sessions/:session_id` : Clôture forcée.

## Events temps réel
- `PLAYER_JOINED`
- `PLAYER_LEFT`
- `ENCOUNTER_COMPLETED`
- `LOOT_ROLL`
- `RUNIC_ANOMALY_DETECTED`

## Persistence
- Snapshots compressés dans S3.
- Indexation PostgreSQL partitionnée par date et shard de session.
- TTL 30 jours sur les runs expirés.

## Observabilité
- Stream d'événements instrumenté (trace Otel `game_state.session_id`).
- Dashboards Grafana : latence moyenne, erreurs 5xx, taille des snapshots.
