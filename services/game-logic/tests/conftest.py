import json
import os
import tempfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def gacha_pools_file(tmp_path):
    """Create a temporary gacha pools JSON file for tests."""
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
                {
                    "id": "rare_1",
                    "name": "Rare Shield",
                    "rarity": "rare",
                    "weight": 15.0,
                    "element": "shadow",
                },
                {
                    "id": "legendary_1",
                    "name": "Legendary Blade",
                    "rarity": "legendary",
                    "weight": 1.0,
                    "element": "fire",
                },
            ],
        }
    ]
    pools_file = tmp_path / "gacha-pools.json"
    pools_file.write_text(json.dumps(pools), encoding="utf-8")
    os.environ["GACHA_POOLS_PATH"] = str(pools_file)
    yield str(pools_file)
    os.environ.pop("GACHA_POOLS_PATH", None)


@pytest_asyncio.fixture
async def client(gacha_pools_file):
    # Force settings reload with the test pools path
    from app.config import settings

    settings.gacha_pools_path = gacha_pools_file

    from app.main import app
    from app.services.combat_engine import CombatEngine
    from app.services.gacha_system import GachaSystem
    from app.services.progression import ProgressionService
    from app.services.anomaly_detector import AnomalyDetector

    # Manually initialize app.state (ASGITransport doesn't trigger lifespan)
    app.state.combat_engine = CombatEngine()
    app.state.gacha_system = GachaSystem(gacha_pools_file)
    app.state.progression_service = ProgressionService()
    app.state.anomaly_detector = AnomalyDetector()

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as ac:
        yield ac
