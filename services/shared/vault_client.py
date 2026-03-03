"""HashiCorp Vault client for Umbra services.

Provides a thin wrapper around the hvac library with:
- Secret retrieval from KV v2 engine
- Health checking
- Automatic token renewal
- Graceful fallback when Vault is unavailable
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Optional

import hvac
from hvac.exceptions import VaultError

logger = logging.getLogger(__name__)

# Default mount point for the KV v2 secrets engine
_DEFAULT_MOUNT = "secret"

# Token renewal happens when remaining TTL drops below this (seconds)
_RENEWAL_THRESHOLD_SECONDS = 300  # 5 minutes


class VaultClient:
    """Client for reading secrets from HashiCorp Vault KV v2 engine.

    Usage::

        client = VaultClient(addr="http://vault:8200", token="s.xxxxx")
        api_key = client.get_secret("umbra/ai-director", "OPENAI_API_KEY")
        if client.health_check():
            print("Vault is reachable")
    """

    def __init__(
        self,
        addr: str,
        token: str,
        mount: str = _DEFAULT_MOUNT,
        namespace: Optional[str] = None,
        auto_renew: bool = True,
    ) -> None:
        self._addr = addr
        self._mount = mount
        self._auto_renew = auto_renew
        self._client = hvac.Client(url=addr, token=token, namespace=namespace)
        self._renewal_thread: Optional[threading.Thread] = None
        self._stop_renewal = threading.Event()

        if auto_renew:
            self._start_renewal_loop()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_secret(self, path: str, key: str) -> Optional[str]:
        """Retrieve a single secret value from Vault KV v2.

        Args:
            path: Secret path under the mount, e.g. ``umbra/ai-director``.
            key: Key within the secret data, e.g. ``OPENAI_API_KEY``.

        Returns:
            The secret value as a string, or ``None`` if the path/key
            does not exist or Vault is unreachable.
        """
        try:
            response = self._client.secrets.kv.v2.read_secret_version(
                path=path,
                mount_point=self._mount,
            )
            data: dict[str, Any] = response.get("data", {}).get("data", {})
            value = data.get(key)
            if value is not None:
                return str(value)
            logger.warning("Key '%s' not found at path '%s'", key, path)
            return None
        except VaultError as exc:
            logger.error("Vault read error for %s/%s: %s", path, key, exc)
            return None
        except Exception as exc:  # noqa: BLE001
            logger.error("Unexpected error reading Vault: %s", exc)
            return None

    def get_secrets(self, path: str) -> dict[str, str]:
        """Retrieve all key-value pairs at a Vault KV v2 path.

        Returns an empty dict if the path does not exist or Vault is
        unreachable.
        """
        try:
            response = self._client.secrets.kv.v2.read_secret_version(
                path=path,
                mount_point=self._mount,
            )
            data: dict[str, Any] = response.get("data", {}).get("data", {})
            return {k: str(v) for k, v in data.items()}
        except VaultError as exc:
            logger.error("Vault read error for %s: %s", path, exc)
            return {}
        except Exception as exc:  # noqa: BLE001
            logger.error("Unexpected error reading Vault: %s", exc)
            return {}

    def health_check(self) -> bool:
        """Return ``True`` if Vault is initialized, unsealed, and reachable."""
        try:
            health = self._client.sys.read_health_status(method="GET")
            # health_status returns a dict when healthy
            if isinstance(health, dict):
                return health.get("initialized", False) and not health.get(
                    "sealed", True
                )
            # Some hvac versions return a Response object
            return health.status_code == 200
        except Exception:  # noqa: BLE001
            return False

    def close(self) -> None:
        """Stop the renewal thread and release resources."""
        self._stop_renewal.set()
        if self._renewal_thread and self._renewal_thread.is_alive():
            self._renewal_thread.join(timeout=5)

    # ------------------------------------------------------------------
    # Token renewal
    # ------------------------------------------------------------------

    def _start_renewal_loop(self) -> None:
        """Start a background thread that renews the Vault token."""
        self._renewal_thread = threading.Thread(
            target=self._renewal_worker,
            daemon=True,
            name="vault-token-renewal",
        )
        self._renewal_thread.start()

    def _renewal_worker(self) -> None:
        """Periodically check token TTL and renew if needed."""
        while not self._stop_renewal.is_set():
            try:
                self._maybe_renew_token()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Token renewal check failed: %s", exc)
            # Check every 60 seconds
            self._stop_renewal.wait(timeout=60)

    def _maybe_renew_token(self) -> None:
        """Renew the token if its remaining TTL is below the threshold."""
        try:
            token_info = self._client.auth.token.lookup_self()
            ttl = token_info.get("data", {}).get("ttl", 0)
            renewable = token_info.get("data", {}).get("renewable", False)

            if not renewable:
                return

            if ttl < _RENEWAL_THRESHOLD_SECONDS:
                logger.info(
                    "Vault token TTL is %ds (threshold %ds), renewing...",
                    ttl,
                    _RENEWAL_THRESHOLD_SECONDS,
                )
                self._client.auth.token.renew_self()
                logger.info("Vault token renewed successfully")
        except VaultError as exc:
            logger.warning("Failed to renew Vault token: %s", exc)

    # ------------------------------------------------------------------
    # Context manager
    # ------------------------------------------------------------------

    def __enter__(self) -> "VaultClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


# ------------------------------------------------------------------
# Module-level singleton for convenience
# ------------------------------------------------------------------

_instance: Optional[VaultClient] = None


def get_vault_client(
    addr: Optional[str] = None,
    token: Optional[str] = None,
) -> Optional[VaultClient]:
    """Return the module-level VaultClient singleton.

    Creates the client on first call if ``addr`` and ``token`` are provided.
    Returns ``None`` if Vault is not configured (addr/token not set).
    """
    global _instance  # noqa: PLW0603
    if _instance is not None:
        return _instance
    if not addr or not token:
        return None
    _instance = VaultClient(addr=addr, token=token)
    return _instance


def close_vault_client() -> None:
    """Shut down the module-level singleton, if any."""
    global _instance  # noqa: PLW0603
    if _instance is not None:
        _instance.close()
        _instance = None
