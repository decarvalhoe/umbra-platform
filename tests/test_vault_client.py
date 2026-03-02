"""Tests for the shared Vault client."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from services.shared.vault_client import (
    VaultClient,
    close_vault_client,
    get_vault_client,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _reset_singleton():
    """Ensure the module-level singleton is reset between tests."""
    close_vault_client()
    yield
    close_vault_client()


@pytest.fixture
def mock_hvac():
    """Patch hvac.Client and return the mock instance."""
    with patch("services.shared.vault_client.hvac.Client") as mock_cls:
        mock_instance = MagicMock()
        mock_cls.return_value = mock_instance
        yield mock_instance


# ---------------------------------------------------------------------------
# VaultClient.get_secret
# ---------------------------------------------------------------------------


class TestGetSecret:
    def test_returns_value_when_present(self, mock_hvac):
        mock_hvac.secrets.kv.v2.read_secret_version.return_value = {
            "data": {"data": {"OPENAI_API_KEY": "sk-test-123"}}
        }
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        result = client.get_secret("umbra/ai-director", "OPENAI_API_KEY")
        assert result == "sk-test-123"
        client.close()

    def test_returns_none_when_key_missing(self, mock_hvac):
        mock_hvac.secrets.kv.v2.read_secret_version.return_value = {
            "data": {"data": {"OTHER_KEY": "value"}}
        }
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        result = client.get_secret("umbra/ai-director", "MISSING_KEY")
        assert result is None
        client.close()

    def test_returns_none_on_vault_error(self, mock_hvac):
        from hvac.exceptions import VaultError

        mock_hvac.secrets.kv.v2.read_secret_version.side_effect = VaultError("denied")
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        result = client.get_secret("umbra/ai-director", "KEY")
        assert result is None
        client.close()

    def test_returns_none_on_unexpected_error(self, mock_hvac):
        mock_hvac.secrets.kv.v2.read_secret_version.side_effect = ConnectionError("gone")
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        result = client.get_secret("umbra/ai-director", "KEY")
        assert result is None
        client.close()


# ---------------------------------------------------------------------------
# VaultClient.get_secrets
# ---------------------------------------------------------------------------


class TestGetSecrets:
    def test_returns_all_keys(self, mock_hvac):
        mock_hvac.secrets.kv.v2.read_secret_version.return_value = {
            "data": {"data": {"A": "1", "B": "2"}}
        }
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        result = client.get_secrets("umbra/shared")
        assert result == {"A": "1", "B": "2"}
        client.close()

    def test_returns_empty_dict_on_error(self, mock_hvac):
        from hvac.exceptions import VaultError

        mock_hvac.secrets.kv.v2.read_secret_version.side_effect = VaultError("nope")
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        result = client.get_secrets("umbra/shared")
        assert result == {}
        client.close()


# ---------------------------------------------------------------------------
# VaultClient.health_check
# ---------------------------------------------------------------------------


class TestHealthCheck:
    def test_healthy_vault(self, mock_hvac):
        mock_hvac.sys.read_health_status.return_value = {
            "initialized": True,
            "sealed": False,
        }
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        assert client.health_check() is True
        client.close()

    def test_sealed_vault(self, mock_hvac):
        mock_hvac.sys.read_health_status.return_value = {
            "initialized": True,
            "sealed": True,
        }
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        assert client.health_check() is False
        client.close()

    def test_unreachable_vault(self, mock_hvac):
        mock_hvac.sys.read_health_status.side_effect = ConnectionError("timeout")
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        assert client.health_check() is False
        client.close()


# ---------------------------------------------------------------------------
# Token renewal
# ---------------------------------------------------------------------------


class TestTokenRenewal:
    def test_renews_when_ttl_low(self, mock_hvac):
        mock_hvac.auth.token.lookup_self.return_value = {
            "data": {"ttl": 60, "renewable": True}
        }
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        client._maybe_renew_token()
        mock_hvac.auth.token.renew_self.assert_called_once()
        client.close()

    def test_skips_renewal_when_ttl_sufficient(self, mock_hvac):
        mock_hvac.auth.token.lookup_self.return_value = {
            "data": {"ttl": 3600, "renewable": True}
        }
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        client._maybe_renew_token()
        mock_hvac.auth.token.renew_self.assert_not_called()
        client.close()

    def test_skips_non_renewable_token(self, mock_hvac):
        mock_hvac.auth.token.lookup_self.return_value = {
            "data": {"ttl": 60, "renewable": False}
        }
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=False)
        client._maybe_renew_token()
        mock_hvac.auth.token.renew_self.assert_not_called()
        client.close()

    def test_auto_renew_starts_thread(self, mock_hvac):
        mock_hvac.auth.token.lookup_self.return_value = {
            "data": {"ttl": 3600, "renewable": True}
        }
        client = VaultClient(addr="http://vault:8200", token="tok", auto_renew=True)
        assert client._renewal_thread is not None
        assert client._renewal_thread.is_alive()
        client.close()


# ---------------------------------------------------------------------------
# Singleton helpers
# ---------------------------------------------------------------------------


class TestSingleton:
    def test_returns_none_when_not_configured(self):
        assert get_vault_client() is None
        assert get_vault_client(addr=None, token=None) is None

    def test_creates_and_caches_client(self, mock_hvac):
        client = get_vault_client(addr="http://vault:8200", token="tok")
        assert client is not None
        # Second call returns same instance
        client2 = get_vault_client()
        assert client2 is client

    def test_close_resets_singleton(self, mock_hvac):
        client = get_vault_client(addr="http://vault:8200", token="tok")
        assert client is not None
        close_vault_client()
        assert get_vault_client() is None


# ---------------------------------------------------------------------------
# Context manager
# ---------------------------------------------------------------------------


class TestContextManager:
    def test_context_manager_closes(self, mock_hvac):
        with VaultClient(addr="http://vault:8200", token="tok", auto_renew=False) as client:
            assert client is not None
        # close() was called (stop_renewal is set)
        assert client._stop_renewal.is_set()
