# HashiCorp Vault Integration

Umbra uses HashiCorp Vault for production secrets management. In development, Vault runs in dev mode via docker-compose; in production, configure a proper Vault cluster with TLS and persistent storage.

## Quick Start (Local Dev)

1. Start the stack (Vault starts automatically):

```bash
docker-compose up -d vault
```

2. Seed Vault with secrets from your `.env` file:

```bash
export VAULT_ADDR=http://127.0.0.1:8200
export VAULT_TOKEN=umbra-dev-token
./infrastructure/vault/init-secrets.sh .env
```

3. Verify secrets were written:

```bash
vault kv list secret/umbra/
vault kv get secret/umbra/ai-director
vault kv get secret/umbra/payment
vault kv get secret/umbra/shared
```

## Architecture

### Secret Paths

Secrets are organized under `secret/umbra/` with per-service sub-paths:

| Path | Service | Example Keys |
|------|---------|-------------|
| `secret/umbra/ai-director` | AI Director | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` |
| `secret/umbra/game-logic` | Game Logic | (service-specific config) |
| `secret/umbra/payment` | Payment | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `secret/umbra/shared` | All services | `REDIS_URL`, `LOG_LEVEL` |

### How It Works

Each service's `config.py` has a Pydantic `@model_validator` that:

1. Checks if `VAULT_ADDR` and `VAULT_TOKEN` are set
2. If yes, fetches secrets from both `umbra/{service}` and `umbra/shared`
3. Merges Vault values with env vars (env vars take precedence)
4. If Vault is unreachable, falls back silently to env vars

### Health Check

Every service's `/health` endpoint includes Vault status:

```json
{
  "status": "ok",
  "service": "ai-director",
  "vault": {
    "status": "connected",
    "addr": "http://vault:8200"
  }
}
```

Possible vault statuses: `connected`, `unreachable`, `not_configured`, `error`.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VAULT_ADDR` | Vault server URL | (none - Vault disabled) |
| `VAULT_TOKEN` | Authentication token | (none) |

### Files

| File | Purpose |
|------|---------|
| `vault-config.hcl` | Vault server configuration (dev mode) |
| `policy.hcl` | Read-only policy for service tokens |
| `init-secrets.sh` | Seeds Vault from a `.env` file |

## Production Deployment

For production, replace the dev-mode Vault with a proper deployment:

1. Use a persistent storage backend (Consul, Raft, or cloud-managed)
2. Enable TLS on the listener
3. Use AppRole or Kubernetes auth instead of static tokens
4. Apply the `umbra-service` policy to service tokens
5. Set `VAULT_ADDR` and `VAULT_TOKEN` on each service (or use agent auto-auth)

### Token Rotation

The `VaultClient` includes an auto-renewal thread that:
- Checks token TTL every 60 seconds
- Renews the token when TTL drops below 5 minutes
- Works with renewable tokens (not root tokens in dev mode)

For production, use short-lived tokens with AppRole and let the renewal thread handle extensions.
