# Player Service - Documentation API

## Vue d'ensemble
Gère le profil joueur, l'inventaire permanent et les paramètres de personnalisation.

## Endpoints principaux
- `GET /api/players/:player_id` : Récupération d'un profil.
- `PATCH /api/players/:player_id` : Mise à jour des préférences.
- `GET /api/players/:player_id/inventory` : Inventaire permanent.
- `POST /api/players/:player_id/inventory` : Ajout/Suppression d'items.
- `GET /api/players/:player_id/stats` : Statistiques globales et historiques.

## Schémas clés
```json
{
  "player_id": "uuid",
  "level": 42,
  "xp": 32000,
  "build": {
    "class": "Shadowblade",
    "specializations": ["Assassin", "Voidwalker"],
    "talents": [
      { "id": "shadow_step", "rank": 3 },
      { "id": "soul_chain", "rank": 2 }
    ]
  }
}
```

## Considérations
- Validation stricte des patchs JSON Schema.
- Mise en cache Redis pour `/inventory` et `/stats` (TTL 60s).
- Webhooks vers le client jeu pour synchroniser les changements en live.
