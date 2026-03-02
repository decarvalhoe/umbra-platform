# Vault policy for Umbra services.
# Grants read-only access to the secret/umbra/* path.
# Each service reads from its own sub-path:
#   secret/umbra/ai-director/*
#   secret/umbra/game-logic/*
#   secret/umbra/payment/*
#   secret/umbra/shared/*

path "secret/data/umbra/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/umbra/*" {
  capabilities = ["read", "list"]
}
