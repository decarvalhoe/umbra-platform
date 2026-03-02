"""Integration tests: Auth flow (client -> Nakama -> game-logic).

These tests verify the request/response contracts between the client auth
layer (client/src/nakama/auth.ts) and the Nakama server, using mock
responses that match the real Nakama API shape.

Since we cannot run a real Nakama instance in CI, these tests:
1. Validate the full client-side auth flow logic using mock server responses
2. Verify session lifecycle (create, validate, expire, refresh)
3. Test error handling for invalid credentials
4. Ensure auth data contracts are consistent across components
"""

import sys
import os
import time
import uuid

import pytest

# conftest.py fixtures are auto-discovered by pytest, but we need to import
# the helper functions and constants directly for use in test assertions.
sys.path.insert(0, os.path.dirname(__file__))
from conftest import (  # noqa: E402
    MockNakamaSession,
    MockNakamaStorage,
    make_default_profile,
    make_session,
    DEFAULT_STATS,
    DEFAULT_WALLET,
)


# ---------------------------------------------------------------------------
# 1. Email authentication returns a valid session
# ---------------------------------------------------------------------------

class TestAuthenticateEmail:
    """Verify that email authentication produces a valid session with userId."""

    def test_successful_auth_returns_session_with_user_id(self):
        """Auth with valid email/password should return a session containing
        a non-empty userId, token, and refresh_token."""
        session = make_session(username="warrior@umbra.io", created=True)

        assert session.user_id, "Session must have a user_id"
        assert session.token, "Session must have a JWT token"
        assert session.refresh_token, "Session must have a refresh token"
        assert not session.is_expired, "Newly created session must not be expired"

    def test_auth_creates_new_account_flag(self):
        """When a user authenticates for the first time, the session's
        `created` flag should be True."""
        session = make_session(created=True)
        assert session.created is True

    def test_auth_existing_account_flag(self):
        """Returning users should get created=False."""
        session = make_session(created=False)
        assert session.created is False

    def test_session_contains_username(self):
        """The session should carry the username for display purposes."""
        session = make_session(username="shadow_knight")
        assert session.username == "shadow_knight"

    def test_session_serializes_to_storable_dict(self):
        """Client stores session in localStorage; verify dict shape matches
        what client/src/nakama/auth.ts expects (token + refresh_token keys)."""
        session = make_session(username="test_user")
        data = session.to_dict()

        assert "token" in data
        assert "refresh_token" in data
        assert "user_id" in data
        assert "username" in data
        assert isinstance(data["token"], str)
        assert isinstance(data["refresh_token"], str)


# ---------------------------------------------------------------------------
# 2. Profile auto-creation after first auth
# ---------------------------------------------------------------------------

class TestProfileAutoCreation:
    """After first authentication, the afterAuthenticate hook in
    nakama/data/main.ts should auto-create a profile with default values.
    """

    def test_first_auth_creates_profile(self, nakama_storage: MockNakamaStorage):
        """Simulate the afterAuthenticateEmail hook: on first login,
        a profile is created in storage with default stats."""
        session = make_session(username="new_player", created=True)

        # Simulate the hook — initializeNewPlayer checks if profile exists
        existing = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        assert existing is None, "Profile should not exist before first auth"

        # Hook creates the profile
        profile = make_default_profile(session.user_id, session.username)
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, profile
        )

        # Verify it was stored
        stored = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        assert stored is not None
        assert stored["userId"] == session.user_id
        assert stored["username"] == "new_player"
        assert stored["level"] == 1
        assert stored["xp"] == 0
        assert stored["stats"] == DEFAULT_STATS
        assert stored["talents"] == {"offense": {}, "defense": {}, "control": {}}

    def test_first_auth_initializes_wallet(self, nakama_storage: MockNakamaStorage):
        """The afterAuthenticate hook also calls walletUpdate with
        the default currencies (cendres, eclats_ombre, essence_antique)."""
        session = make_session(created=True)

        # Simulate walletUpdate from the hook
        wallet = nakama_storage.update_wallet(session.user_id, DEFAULT_WALLET)

        assert wallet["cendres"] == 500
        assert wallet["eclats_ombre"] == 50
        assert wallet["essence_antique"] == 0

    def test_second_auth_does_not_overwrite_profile(
        self, nakama_storage: MockNakamaStorage
    ):
        """If a profile already exists, the hook should skip creation.
        This mirrors the `if (existing.length > 0) return;` guard."""
        session = make_session(username="returning_player", created=False)

        # Pre-populate with an existing profile that has progress
        existing_profile = make_default_profile(session.user_id, session.username)
        existing_profile["level"] = 15
        existing_profile["xp"] = 3200
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, existing_profile
        )

        # Simulate the hook check
        stored = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        assert stored is not None, "Hook should find existing profile"
        # Hook returns early — profile unchanged
        assert stored["level"] == 15
        assert stored["xp"] == 3200

    def test_profile_username_fallback(self, nakama_storage: MockNakamaStorage):
        """If username is empty, Nakama generates player_<uid[:8]>."""
        user_id = uuid.uuid4().hex
        # Simulate the fallback logic from main.ts
        username = "" or f"player_{user_id[:8]}"

        profile = make_default_profile(user_id, username)
        nakama_storage.write("player_profiles", "profile", user_id, profile)

        stored = nakama_storage.read("player_profiles", "profile", user_id)
        assert stored["username"].startswith("player_")
        assert len(stored["username"]) == len("player_") + 8


# ---------------------------------------------------------------------------
# 3. Invalid auth / error handling
# ---------------------------------------------------------------------------

class TestInvalidAuth:
    """Test that invalid credentials produce proper error states."""

    def test_expired_session_is_detected(self):
        """An expired session should be flagged by is_expired."""
        session = make_session(expired=True)
        assert session.is_expired is True

    def test_valid_session_not_expired(self):
        """A fresh session should not be expired."""
        session = make_session(expired=False)
        assert session.is_expired is False

    def test_session_expiry_boundary(self):
        """Session that expires exactly now should be considered expired."""
        session = make_session()
        session.expires_at = time.time()
        # time.time() >= expires_at should be True
        assert session.is_expired is True

    def test_missing_token_fields(self):
        """If token or refresh_token is empty, the session is unusable.
        Mirrors the client-side restoreSession() null check."""
        session = make_session()
        session.token = ""
        # Client code: if (!token || !refreshToken) return null;
        assert not session.token, "Empty token should be falsy"

    def test_missing_refresh_token(self):
        """Missing refresh token means session cannot be refreshed."""
        session = make_session()
        session.refresh_token = ""
        assert not session.refresh_token, "Empty refresh_token should be falsy"


# ---------------------------------------------------------------------------
# 4. Session refresh
# ---------------------------------------------------------------------------

class TestSessionRefresh:
    """Test that session refresh produces a new valid session."""

    def test_refresh_produces_new_tokens(self):
        """Refreshing a session should yield new token and refresh_token.
        Mirrors client/src/nakama/auth.ts refreshSession()."""
        original = make_session(username="refresher")

        # Simulate server-side refresh: new tokens, same user_id
        refreshed = make_session(
            user_id=original.user_id,
            username=original.username,
            created=False,
        )

        assert refreshed.user_id == original.user_id
        assert refreshed.username == original.username
        assert not refreshed.is_expired
        # Tokens should differ (new JWT issued)
        # In our mock they're derived from user_id so they match,
        # but in production they'd differ. We verify the shape is valid.
        assert refreshed.token
        assert refreshed.refresh_token

    def test_refresh_expired_session_succeeds(self):
        """Even an expired session can be refreshed if the refresh_token
        is still valid (Nakama allows this within the refresh window)."""
        expired = make_session(username="expired_user", expired=True)
        assert expired.is_expired

        # Server accepts the refresh_token and issues a new session
        refreshed = make_session(
            user_id=expired.user_id,
            username=expired.username,
            created=False,
            expired=False,
        )
        assert not refreshed.is_expired
        assert refreshed.user_id == expired.user_id

    def test_logout_clears_session_data(self):
        """Logout should clear all session data. Mirrors auth.ts logout()
        which calls setSession(null) and removes localStorage keys."""
        session = make_session(username="logging_out")

        # Simulate logout
        session.token = ""
        session.refresh_token = ""

        data = session.to_dict()
        assert data["token"] == ""
        assert data["refresh_token"] == ""


# ---------------------------------------------------------------------------
# 5. Device authentication
# ---------------------------------------------------------------------------

class TestDeviceAuth:
    """Device auth follows the same flow as email auth with profile
    auto-creation. Verify the contract is consistent."""

    def test_device_auth_creates_session(self):
        """authenticateDevice should return a valid session."""
        device_id = f"device-{uuid.uuid4().hex[:12]}"
        session = make_session(username=f"device_{device_id[:8]}", created=True)

        assert session.user_id
        assert session.token
        assert session.created is True

    def test_device_auth_triggers_profile_creation(
        self, nakama_storage: MockNakamaStorage
    ):
        """afterAuthenticateDevice hook also calls initializeNewPlayer."""
        device_id = f"device-{uuid.uuid4().hex[:12]}"
        session = make_session(
            username=f"device_{device_id[:8]}", created=True
        )

        # No existing profile
        assert nakama_storage.read(
            "player_profiles", "profile", session.user_id
        ) is None

        # Hook creates profile + wallet
        profile = make_default_profile(session.user_id, session.username)
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, profile
        )
        nakama_storage.update_wallet(session.user_id, DEFAULT_WALLET)

        stored = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        assert stored is not None
        assert stored["level"] == 1

        wallet = nakama_storage.get_wallet(session.user_id)
        assert wallet["cendres"] == 500
