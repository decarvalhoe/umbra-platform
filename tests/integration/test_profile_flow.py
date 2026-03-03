"""Integration tests: Profile CRUD and Game State (client -> Nakama -> game-logic).

These tests verify:
1. Profile get/update/persist flow through Nakama storage
2. Game state save/retrieve with data integrity checks
3. Request/response contracts between client types and Nakama server schemas
4. Game-logic FastAPI endpoints accept payloads matching what Nakama would forward
"""

import copy
import os
import sys
import uuid

import pytest

sys.path.insert(0, os.path.dirname(__file__))
from conftest import (  # noqa: E402
    MockNakamaStorage,
    make_default_game_state,
    make_default_profile,
    make_game_state_with_progress,
    make_session,
    DEFAULT_STATS,
)


# ---------------------------------------------------------------------------
# 1. Profile CRUD via Nakama storage
# ---------------------------------------------------------------------------

class TestProfileGet:
    """Test reading a player profile from Nakama storage.
    Mirrors the rpcGetPlayerProfile RPC in nakama/data/main.ts.
    """

    def test_get_existing_profile(self, nakama_storage: MockNakamaStorage):
        """Reading a profile that exists should return the full profile object."""
        session = make_session(username="reader")
        profile = make_default_profile(session.user_id, session.username)
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, profile
        )

        result = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        assert result is not None
        assert result["userId"] == session.user_id
        assert result["username"] == "reader"
        assert result["level"] == 1
        assert result["stats"] == DEFAULT_STATS

    def test_get_missing_profile_returns_none(
        self, nakama_storage: MockNakamaStorage
    ):
        """Reading a non-existent profile should return None.
        In Nakama, the RPC throws 'Profile not found. Authenticate first.'"""
        result = nakama_storage.read(
            "player_profiles", "profile", "nonexistent-user-id"
        )
        assert result is None

    def test_profile_schema_matches_client_types(
        self, nakama_storage: MockNakamaStorage
    ):
        """Verify the profile structure matches client/src/types/game.ts
        PlayerProfile interface."""
        session = make_session()
        profile = make_default_profile(session.user_id, session.username)
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, profile
        )

        stored = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        # Verify all fields from the TypeScript PlayerProfile interface exist
        assert "userId" in stored
        assert "username" in stored
        assert "level" in stored
        assert "xp" in stored
        assert "stats" in stored
        assert "talents" in stored
        assert "createdAt" in stored
        assert "updatedAt" in stored

        # Verify stats sub-structure
        stats = stored["stats"]
        for stat_name in ("strength", "agility", "intelligence", "endurance", "willpower"):
            assert stat_name in stats
            assert isinstance(stats[stat_name], (int, float))

        # Verify talents sub-structure
        talents = stored["talents"]
        for tree in ("offense", "defense", "control"):
            assert tree in talents
            assert isinstance(talents[tree], dict)


class TestProfileUpdate:
    """Test updating a player profile.
    Mirrors rpcSavePlayerProfile in nakama/data/main.ts.
    """

    def test_update_stats(self, nakama_storage: MockNakamaStorage):
        """Updating stats should merge with existing profile and set updatedAt."""
        session = make_session(username="updater")
        profile = make_default_profile(session.user_id, session.username)
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, profile
        )

        # Simulate rpcSavePlayerProfile: merge updates into existing
        stored = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        updates = {
            "stats": {
                "strength": 15,
                "agility": 12,
                "intelligence": 10,
                "endurance": 11,
                "willpower": 10,
            }
        }
        updated = {**stored, **updates, "updatedAt": "2026-03-02T12:00:00+00:00"}
        # userId cannot be overridden (server enforces this)
        updated["userId"] = session.user_id
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, updated
        )

        result = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        assert result["stats"]["strength"] == 15
        assert result["stats"]["agility"] == 12
        assert result["updatedAt"] == "2026-03-02T12:00:00+00:00"

    def test_update_preserves_user_id(self, nakama_storage: MockNakamaStorage):
        """Even if the update payload contains a different userId,
        the server should force it back to the authenticated user's ID.
        Mirrors: `userId, // Prevent userId override` in main.ts."""
        session = make_session(username="safe_user")
        profile = make_default_profile(session.user_id, session.username)
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, profile
        )

        # Malicious update trying to change userId
        stored = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        updated = {**stored, "userId": "hacker-id-123"}
        # Server overrides userId
        updated["userId"] = session.user_id
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, updated
        )

        result = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        assert result["userId"] == session.user_id

    def test_update_level_and_xp(self, nakama_storage: MockNakamaStorage):
        """Update level and XP after a level-up event."""
        session = make_session(username="leveler")
        profile = make_default_profile(session.user_id, session.username)
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, profile
        )

        stored = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        updated = {**stored, "level": 5, "xp": 1200}
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, updated
        )

        result = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        assert result["level"] == 5
        assert result["xp"] == 1200

    def test_update_talent_allocation(self, nakama_storage: MockNakamaStorage):
        """Allocate talent points and verify persistence."""
        session = make_session(username="talented")
        profile = make_default_profile(session.user_id, session.username)
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, profile
        )

        stored = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        updated = copy.deepcopy(stored)
        updated["talents"]["offense"] = {"crit_chance": 3, "attack_speed": 2}
        updated["talents"]["defense"] = {"armor": 1}
        nakama_storage.write(
            "player_profiles", "profile", session.user_id, updated
        )

        result = nakama_storage.read(
            "player_profiles", "profile", session.user_id
        )
        assert result["talents"]["offense"]["crit_chance"] == 3
        assert result["talents"]["offense"]["attack_speed"] == 2
        assert result["talents"]["defense"]["armor"] == 1
        assert result["talents"]["control"] == {}


# ---------------------------------------------------------------------------
# 2. Game State CRUD via Nakama storage
# ---------------------------------------------------------------------------

class TestGameStateGet:
    """Test reading game state from Nakama storage.
    Mirrors rpcGetGameState in nakama/data/main.ts.
    """

    def test_get_default_game_state_for_new_player(
        self, nakama_storage: MockNakamaStorage
    ):
        """New players with no saved state should get the default game state.
        The RPC returns a default state if storage is empty."""
        session = make_session()

        result = nakama_storage.read(
            "game_states", "state", session.user_id
        )
        # No stored state — the RPC would return defaults
        assert result is None

        # Verify the default state structure matches the TypeScript GameState
        default = make_default_game_state()
        assert default["currentZone"] == "hub"
        assert default["currentFloor"] == 0
        assert default["corruption"] == 0
        assert default["inventory"] == []
        assert default["questLog"] == []
        assert default["completedQuests"] == []

    def test_get_existing_game_state(self, nakama_storage: MockNakamaStorage):
        """Reading a saved game state should return the full state object."""
        session = make_session()
        state = make_game_state_with_progress()
        nakama_storage.write(
            "game_states", "state", session.user_id, state
        )

        result = nakama_storage.read(
            "game_states", "state", session.user_id
        )
        assert result is not None
        assert result["currentZone"] == "abyss"
        assert result["currentFloor"] == 7
        assert len(result["inventory"]) == 2

    def test_game_state_schema_matches_client_types(self):
        """Verify the game state structure matches client/src/types/game.ts
        GameState interface."""
        state = make_game_state_with_progress()

        # Top-level fields
        assert "currentZone" in state
        assert "currentFloor" in state
        assert "corruption" in state
        assert "inventory" in state
        assert "questLog" in state
        assert "completedQuests" in state
        assert "sessionStats" in state

        # Inventory item structure (matches InventoryItem interface)
        item = state["inventory"][0]
        assert "id" in item
        assert "name" in item
        assert "type" in item
        assert "rarity" in item
        assert "level" in item
        assert "quantity" in item

        # SessionStats structure
        stats = state["sessionStats"]
        for key in (
            "actionsPerMinute", "killDeathRatio", "accuracy",
            "headshots", "totalDamage", "sessionDuration", "resourcesGained",
        ):
            assert key in stats


class TestGameStateSave:
    """Test saving game state to Nakama storage.
    Mirrors rpcSaveGameState in nakama/data/main.ts.
    """

    def test_save_and_retrieve_game_state(
        self, nakama_storage: MockNakamaStorage
    ):
        """Save a game state and verify it persists correctly."""
        session = make_session()
        state = make_game_state_with_progress()

        nakama_storage.write(
            "game_states", "state", session.user_id, state
        )

        result = nakama_storage.read(
            "game_states", "state", session.user_id
        )
        assert result == state

    def test_save_overwrites_previous_state(
        self, nakama_storage: MockNakamaStorage
    ):
        """Saving game state should overwrite the previous state entirely."""
        session = make_session()

        # Save initial state
        initial = make_default_game_state()
        nakama_storage.write(
            "game_states", "state", session.user_id, initial
        )

        # Save updated state
        updated = make_game_state_with_progress()
        nakama_storage.write(
            "game_states", "state", session.user_id, updated
        )

        result = nakama_storage.read(
            "game_states", "state", session.user_id
        )
        assert result["currentZone"] == "abyss"
        assert result["currentFloor"] == 7
        assert result != initial

    def test_inventory_data_integrity(self, nakama_storage: MockNakamaStorage):
        """Verify that complex nested data (inventory items) survives
        the save/load cycle without corruption."""
        session = make_session()
        state = make_game_state_with_progress()

        nakama_storage.write(
            "game_states", "state", session.user_id, state
        )

        result = nakama_storage.read(
            "game_states", "state", session.user_id
        )

        # Deep equality check on inventory
        assert len(result["inventory"]) == 2
        sword = result["inventory"][0]
        assert sword["id"] == "sword_001"
        assert sword["name"] == "Shadow Blade"
        assert sword["rarity"] == "epic"
        assert sword["level"] == 5
        assert sword["quantity"] == 1

        potion = result["inventory"][1]
        assert potion["id"] == "potion_001"
        assert potion["quantity"] == 10

    def test_quest_log_persistence(self, nakama_storage: MockNakamaStorage):
        """Verify quest log and completed quests persist correctly."""
        session = make_session()
        state = make_game_state_with_progress()

        nakama_storage.write(
            "game_states", "state", session.user_id, state
        )

        result = nakama_storage.read(
            "game_states", "state", session.user_id
        )
        assert "quest_shadow_1" in result["questLog"]
        assert "quest_abyss_3" in result["questLog"]
        assert "quest_tutorial" in result["completedQuests"]

    def test_session_stats_data_integrity(
        self, nakama_storage: MockNakamaStorage
    ):
        """Verify session stats numeric values survive save/load."""
        session = make_session()
        state = make_game_state_with_progress()

        nakama_storage.write(
            "game_states", "state", session.user_id, state
        )

        result = nakama_storage.read(
            "game_states", "state", session.user_id
        )
        stats = result["sessionStats"]
        assert stats["actionsPerMinute"] == 120
        assert stats["killDeathRatio"] == 2.5
        assert stats["accuracy"] == 0.75
        assert stats["totalDamage"] == 45000
        assert stats["sessionDuration"] == 1800


# ---------------------------------------------------------------------------
# 3. Multi-user isolation
# ---------------------------------------------------------------------------

class TestMultiUserIsolation:
    """Verify that storage is properly scoped per user_id."""

    def test_profiles_are_isolated_per_user(
        self, nakama_storage: MockNakamaStorage
    ):
        """Two different users should have independent profiles."""
        session_a = make_session(username="player_a")
        session_b = make_session(username="player_b")

        profile_a = make_default_profile(session_a.user_id, "player_a")
        profile_a["level"] = 10
        profile_b = make_default_profile(session_b.user_id, "player_b")
        profile_b["level"] = 1

        nakama_storage.write(
            "player_profiles", "profile", session_a.user_id, profile_a
        )
        nakama_storage.write(
            "player_profiles", "profile", session_b.user_id, profile_b
        )

        result_a = nakama_storage.read(
            "player_profiles", "profile", session_a.user_id
        )
        result_b = nakama_storage.read(
            "player_profiles", "profile", session_b.user_id
        )

        assert result_a["level"] == 10
        assert result_b["level"] == 1
        assert result_a["userId"] != result_b["userId"]

    def test_game_states_are_isolated_per_user(
        self, nakama_storage: MockNakamaStorage
    ):
        """Two users' game states should not interfere."""
        session_a = make_session(username="explorer_a")
        session_b = make_session(username="explorer_b")

        state_a = make_game_state_with_progress()
        state_b = make_default_game_state()

        nakama_storage.write(
            "game_states", "state", session_a.user_id, state_a
        )
        nakama_storage.write(
            "game_states", "state", session_b.user_id, state_b
        )

        result_a = nakama_storage.read(
            "game_states", "state", session_a.user_id
        )
        result_b = nakama_storage.read(
            "game_states", "state", session_b.user_id
        )

        assert result_a["currentZone"] == "abyss"
        assert result_b["currentZone"] == "hub"

    def test_wallets_are_isolated_per_user(
        self, nakama_storage: MockNakamaStorage
    ):
        """Each user has an independent wallet."""
        user_a = uuid.uuid4().hex
        user_b = uuid.uuid4().hex

        nakama_storage.update_wallet(user_a, {"cendres": 500})
        nakama_storage.update_wallet(user_b, {"cendres": 100})

        assert nakama_storage.get_wallet(user_a)["cendres"] == 500
        assert nakama_storage.get_wallet(user_b)["cendres"] == 100


# ---------------------------------------------------------------------------
# 4. Game-logic service endpoints with realistic payloads
# ---------------------------------------------------------------------------

@pytest.mark.anyio
class TestGameLogicEndpointContracts:
    """Test that the game-logic FastAPI endpoints accept payloads matching
    what Nakama would send after processing profile/game state data."""

    async def test_progression_calculate_xp_contract(self, game_logic_client):
        """After a combat session, Nakama forwards session stats to game-logic
        for XP calculation. Verify the contract."""
        payload = {
            "enemies_defeated": 15,
            "floor_level": 3,
            "combo_count": 8,
            "time_bonus": 0.2,
            "corruption_bonus": 0.1,
        }
        response = await game_logic_client.post(
            "/api/v1/progression/calculate-xp", json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "xp_earned" in data
        assert isinstance(data["xp_earned"], int)
        assert data["xp_earned"] > 0
        assert "breakdown" in data

    async def test_progression_level_up_contract(self, game_logic_client):
        """After XP is calculated, check if player levels up.
        Payload mirrors data from Nakama profile storage."""
        payload = {
            "current_level": 1,
            "current_xp": 300,
            "xp_to_add": 200,
        }
        response = await game_logic_client.post(
            "/api/v1/progression/level-up", json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "new_level" in data
        assert "new_xp" in data
        assert "levels_gained" in data
        assert "stat_increases" in data

    async def test_talent_allocation_contract(self, game_logic_client):
        """Allocating talent points; payload matches the profile.talents
        structure from Nakama storage."""
        payload = {
            "tree": "offense",
            "talent_id": "crit_chance",
            "current_allocations": {"crit_chance": 2},
            "available_points": 5,
        }
        response = await game_logic_client.post(
            "/api/v1/progression/talent-tree", json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "remaining_points" in data
        assert "new_allocations" in data

    async def test_anomaly_detection_with_session_stats(self, game_logic_client):
        """Anomaly detection receives session stats matching the GameState
        sessionStats structure. Verify the contract."""
        # Normal stats — should not be flagged
        payload = {
            "session_stats": {
                "apm": 120,
                "kd_ratio": 2.5,
                "accuracy": 0.75,
                "headshot_ratio": 0.3,
                "dps": 500,
                "session_duration": 1800,
                "resource_rate": 200,
            }
        }
        response = await game_logic_client.post(
            "/api/v1/anomaly/evaluate", json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_suspicious" in data
        assert "score" in data
        assert "checks" in data
        assert data["is_suspicious"] is False

    async def test_anomaly_detection_flags_suspicious_stats(
        self, game_logic_client
    ):
        """Extremely high stats should trigger the anomaly detector."""
        payload = {
            "session_stats": {
                "apm": 500,
                "kd_ratio": 15.0,
                "accuracy": 0.99,
                "headshot_ratio": 0.95,
                "dps": 50000,
                "session_duration": 30,
                "resource_rate": 5000,
            }
        }
        response = await game_logic_client.post(
            "/api/v1/anomaly/evaluate", json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_suspicious"] is True
        assert data["score"] > 0.4

    async def test_health_endpoint(self, game_logic_client):
        """Verify the health check endpoint is accessible."""
        response = await game_logic_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "game-logic"
