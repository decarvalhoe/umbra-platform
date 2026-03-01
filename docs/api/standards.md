# Standards API - Project Umbra

## 📋 Format de Réponse Standard

Toutes les APIs utilisent le même format de réponse JSON :

```json
{
  "success": boolean,
  "data": object | array | null,
  "message": string,
  "error": {
    "code": string,
    "details": string
  } | null,
  "meta": {
    "pagination": object,
    "version": string,
    "timestamp": string
  } | null
}
```

### Exemples

**Succès :**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "player@example.com"
  },
  "message": "Utilisateur récupéré avec succès",
  "error": null,
  "meta": {
    "version": "1.0.0",
    "timestamp": "2025-08-15T10:30:00Z"
  }
}
```

**Erreur :**
```json
{
  "success": false,
  "data": null,
  "message": "Email ou mot de passe incorrect",
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "details": "Les identifiants fournis ne correspondent à aucun compte"
  },
  "meta": null
}
```

## 🔒 Authentification

### JWT Tokens
- **Access Token** : Durée courte (15 min), pour les requêtes API
- **Refresh Token** : Durée longue (7 jours), pour renouveler l'access token

### Headers
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Endpoints d'Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Renouvellement de token
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Informations utilisateur courant

## 📊 Codes d'Erreur Standards

### Authentification (AUTH_*)
- `AUTH_INVALID_CREDENTIALS` - Identifiants incorrects
- `AUTH_TOKEN_EXPIRED` - Token expiré
- `AUTH_TOKEN_INVALID` - Token invalide
- `AUTH_TOKEN_MISSING` - Token manquant
- `AUTH_REFRESH_TOKEN_REVOKED` - Refresh token révoqué

### Validation (VALIDATION_*)
- `VALIDATION_EMAIL_INVALID` - Email invalide
- `VALIDATION_PASSWORD_WEAK` - Mot de passe trop faible
- `VALIDATION_REQUIRED_FIELD` - Champ requis manquant

### Base de Données (DB_*)
- `DB_CONSTRAINT_VIOLATION` - Violation de contrainte
- `DB_CONNECTION_ERROR` - Erreur de connexion

### Système (SYSTEM_*)
- `INTERNAL_SERVER_ERROR` - Erreur serveur interne
- `RATE_LIMIT_EXCEEDED` - Limite de taux dépassée

## 📄 Pagination

Pour les listes d'éléments :

```json
{
  "success": true,
  "data": [...],
  "message": "Liste récupérée",
  "error": null,
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 150,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### Paramètres de Requête
- `page` : Numéro de page (défaut: 1)
- `per_page` : Éléments par page (défaut: 20, max: 100)
- `sort` : Champ de tri
- `order` : Ordre (asc/desc)

## 🔍 Filtrage et Recherche

### Paramètres Standards
- `search` : Recherche textuelle
- `filter[field]` : Filtrage par champ
- `created_after` : Créé après cette date
- `created_before` : Créé avant cette date

### Exemple
```http
GET /api/players?search=john&filter[level]=25&created_after=2025-01-01
```

## ⚡ Performance

### Cache
- Headers de cache appropriés
- ETags pour la validation
- Compression gzip

### Rate Limiting
- Headers standards :
  - `X-RateLimit-Limit` : Limite par fenêtre
  - `X-RateLimit-Remaining` : Requêtes restantes
  - `X-RateLimit-Reset` : Timestamp de reset

## 🔒 Sécurité

### Validation
- Validation stricte de tous les inputs
- Sanitisation des données
- Protection contre l'injection

### CORS
- Origins autorisés configurables
- Headers appropriés

### Logs
- Logs structurés JSON
- Correlation ID pour le tracing
- Pas de données sensibles dans les logs

## 📚 Documentation

### OpenAPI/Swagger
Chaque service expose :
- `/openapi.json` - Schéma OpenAPI
- `/docs` - Interface Swagger UI

### Exemples
Tous les endpoints documentés avec :
- Exemples de requêtes
- Exemples de réponses
- Codes d'erreur possibles

---

**Ces standards garantissent une API cohérente et prévisible pour tous les services Project Umbra.**
