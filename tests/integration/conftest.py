"""Shared fixtures for auth + profile integration tests.

These fixtures provide mock Nakama server responses and test data
that mirror the real Nakama runtime behaviour defined in nakama/data/main.ts.
"""

import json
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


# ---------------------------------------------------------------------------
# Nakama response data structures
# ---------------------------------------------------------------------------

DEFAULT_STATS = {
    "strength": 10,
    "agility": 10,
    "intelligence": 10,
    "endurance": 10,
    "willpower": 10,
}

DEFAULT_WALLET = {
    "cendres": 500,
    "eclats_ombre": 50,
    "essence_antique": 0,
}


@dataclass
class MockNakamaSession:
    """Simulates a Nakama session object returned after authentication."""

    token: str
    refresh_token: str
    user_id: str
    username: str
    created: bool
    expires_at: float = field(default_factory=lambda: time.time() + 3600)

    @property
    def is_expired(self) -> bool:
        return time.time() >= self.expires_at

    def to_dict(self) -> dict[str, Any]:
        return {
            "token": self.token,
            "refresh_token": self.refresh_token,
            "user_id": self.user_id,
            "username": self.username,
            "created": self.created,
        }


def make_session(
    *,
    user_id: str | None = None,
    username: str = "test_player",
    created: bool = True,
    expired: bool = False,
) -> MockNakamaSession:
    """Create a mock Nakama session with sensible defaults."""
    uid = user_id or uuid.uuid4().hex
    expires = time.time() - 1 if expired else time.time() + 3600
    return MockNakamaSession(
        token=f"mock-jwt-token-{uid[:8]}",
        refresh_token=f"mock-refresh-{uid[:8]}",
        user_id=uid,
        username=username,
        created=created,
        expires_at=expires,
    )


# ---------------------------------------------------------------------------
# Profile / game-state factories (mirrors nakama/data/main.ts defaults)
# ---------------------------------------------------------------------------

def make_default_profile(
    user_id: str,
    username: str = "test_player",
) -> dict[str, Any]:
    """Return the profile that Nakama's afterAuthenticate hook would create."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    return {
        "userId": user_id,
        "username": username,
        "level": 1,
        "xp": 0,
        "stats": {**DEFAULT_STATS},
        "talents": {
            "offense": {},
            "defense": {},
            "control": {},
        },
        "createdAt": now,
        "updatedAt": now,
    }


def make_default_game_state() -> dict[str, Any]:
    """Return the default game state that Nakama returns for new players."""
    return {
        "currentZone": "hub",
        "currentFloor": 0,
        "corruption": 0,
        "inventory": [],
        "questLog": [],
        "completedQuests": [],
        "sessionStats": {
            "actionsPerMinute": 0,
            "killDeathRatio": 0,
            "accuracy": 0,
            "headshots": 0,
            "totalDamage": 0,
            "sessionDuration": 0,
            "resourcesGained": 0,
        },
    }


def make_game_state_with_progress() -> dict[str, Any]:
    """Return a game state with some progress for testing persistence."""
    return {
        "currentZone": "abyss",
        "currentFloor": 7,
        "corruption": 35,
        "inventory": [
            {
                "id": "sword_001",
                "name": "Shadow Blade",
                "type": "weapon",
                "rarity": "epic",
                "level": 5,
                "quantity": 1,
            },
            {
                "id": "potion_001",
                "name": "Health Potion",
                "type": "consumable",
                "rarity": "common",
                "level": 1,
                "quantity": 10,
            },
        ],
        "questLog": ["quest_shadow_1", "quest_abyss_3"],
        "completedQuests": ["quest_tutorial"],
        "sessionStats": {
            "actionsPerMinute": 120,
            "killDeathRatio": 2.5,
            "accuracy": 0.75,
            "headshots": 15,
            "totalDamage": 45000,
            "sessionDuration": 1800,
            "resourcesGained": 500,
        },
    }


# ---------------------------------------------------------------------------
# Mock Nakama storage (in-memory)
# ---------------------------------------------------------------------------

class MockNakamaStorage:
    """In-memory storage that mimics Nakama's storage engine.

    Keyed by (collection, key, user_id) tuples, just like Nakama's
    storageRead / storageWrite API.
    """

    def __init__(self) -> None:
        self._data: dict[tuple[str, str, str], dict[str, Any]] = {}
        self._wallets: dict[str, dict[str, int]] = {}

    def write(
        self,
        collection: str,
        key: str,
        user_id: str,
        value: dict[str, Any],
    ) -> None:
        self._data[(collection, key, user_id)] = value

    def read(
        self,
        collection: str,
        key: str,
        user_id: str,
    ) -> dict[str, Any] | None:
        return self._data.get((collection, key, user_id))

    def update_wallet(
        self,
        user_id: str,
        changeset: dict[str, int],
    ) -> dict[str, int]:
        wallet = self._wallets.setdefault(user_id, {})
        for currency, amount in changeset.items():
            wallet[currency] = wallet.get(currency, 0) + amount
        return dict(wallet)

    def get_wallet(self, user_id: str) -> dict[str, int]:
        return dict(self._wallets.get(user_id, {}))

    def clear(self) -> None:
        self._data.clear()
        self._wallets.clear()


@pytest.fixture
def nakama_storage() -> MockNakamaStorage:
    """Fresh in-memory Nakama storage for each test."""
    return MockNakamaStorage()


@pytest.fixture
def mock_session() -> MockNakamaSession:
    """A valid mock session for an authenticated user."""
    return make_session(username="test_player")


@pytest.fixture
def expired_session() -> MockNakamaSession:
    """An expired mock session for testing refresh flows."""
    return make_session(username="test_player", expired=True)


# ---------------------------------------------------------------------------
# Game-logic FastAPI test client
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def gacha_pools_file(tmp_path):
    """Create a temporary gacha pools JSON file for game-logic service tests."""
    pools = [
        {
            "id": "test_pool",
            "name": "Test Pool",
            "pity_threshold": 10,
            "items": [
                {
                    "id": "common_1",
                    "name": "Common Sword",
                    "rarity": "common",
                    "weight": 80.0,
                    "element": None,
                },
            ],
        }
    ]
    pools_file = tmp_path / "gacha-pools.json"
    pools_file.write_text(json.dumps(pools), encoding="utf-8")
    os.environ["GACHA_POOLS_PATH"] = str(pools_file)
    yield str(pools_file)
    os.environ.pop("GACHA_POOLS_PATH", None)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def game_logic_client(gacha_pools_file):
    """Async HTTP client wired to the game-logic FastAPI app."""
    import sys
    # Ensure the game-logic app is importable
    game_logic_root = os.path.join(
        os.path.dirname(__file__), "..", "..", "services", "game-logic"
    )
    abs_root = os.path.abspath(game_logic_root)
    if abs_root not in sys.path:
        sys.path.insert(0, abs_root)

    from app.config import settings
    settings.gacha_pools_path = gacha_pools_file

    from app.main import app
    from app.services.combat_engine import CombatEngine
    from app.services.gacha_system import GachaSystem
    from app.services.progression import ProgressionService
    from app.services.anomaly_detector import AnomalyDetector

    app.state.combat_engine = CombatEngine()
    app.state.gacha_system = GachaSystem(gacha_pools_file)
    app.state.progression_service = ProgressionService()
    app.state.anomaly_detector = AnomalyDetector()

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as ac:
        yield ac
