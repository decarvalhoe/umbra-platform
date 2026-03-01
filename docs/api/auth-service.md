# Auth Service - Documentation API

## Vue d'ensemble
Service responsable de l'identité joueur, de la gestion des sessions et de la sécurité applicative.

## Endpoints principaux
- `POST /api/auth/register` : Inscription d'un nouveau joueur.
- `POST /api/auth/login` : Authentification et émission d'access/refresh tokens.
- `POST /api/auth/refresh` : Renouvellement d'access token.
- `POST /api/auth/logout` : Révocation des tokens actifs.
- `GET /api/auth/me` : Profil authentifié courant.

## Modèles de données
```json
{
  "id": "uuid",
  "email": "string",
  "username": "string",
  "created_at": "datetime",
  "mfa_enabled": "boolean"
}
```

## Règles de sécurité
- Hachage des mots de passe avec Argon2id.
- MFA optionnel via TOTP.
- Limitation de 5 tentatives de login / 15 minutes.
- Rotation automatique des refresh tokens.

## Tests recommandés
- Tests unitaires sur la validation des inputs.
- Tests d'intégration sur le flux login → refresh → logout.
- Tests de charge ciblés (500 logins/minute).
