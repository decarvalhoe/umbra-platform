# Vault server configuration for local development (dev mode).
# In production, use a proper storage backend (Consul, Raft, etc.)
# and TLS certificates.

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1  # Dev only — enable TLS in production
}

ui = true

api_addr = "http://0.0.0.0:8200"

# Dev-mode root token (override via VAULT_DEV_ROOT_TOKEN_ID env var)
# In production, use proper auth methods (AppRole, Kubernetes, etc.)
