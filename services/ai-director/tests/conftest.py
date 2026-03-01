import json
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.services.llm_client import LLMClient


class MockLLMClient(LLMClient):
    """Mock LLM client that returns deterministic JSON responses."""

    async def generate(
        self, prompt: str, system: str = "", max_tokens: int = 2000
    ) -> str:
        if "quest" in prompt.lower():
            return json.dumps(
                {
                    "title": "Test Quest",
                    "description": "A test quest description.",
                    "objectives": ["Objective 1", "Objective 2"],
                    "rewards": {"xp": 100, "gold": 50},
                    "difficulty": "normal",
                }
            )
        if "dungeon" in prompt.lower():
            return json.dumps(
                {
                    "rooms": [
                        {
                            "id": "room_0",
                            "type": "combat",
                            "connections": ["room_1"],
                            "description": "A dark room.",
                        }
                    ],
                    "enemies": [
                        {
                            "id": "enemy_0",
                            "name": "Shade",
                            "level": 5,
                            "element": "shadow",
                            "hp": 200,
                        }
                    ],
                    "rune_placements": [],
                    "corruption_effects": ["Darkness creeps in"],
                }
            )
        if "narrative" in prompt.lower():
            return json.dumps(
                {
                    "narrative": "A mysterious event unfolds before you.",
                    "choices": [
                        {
                            "label": "Investigate",
                            "consequence": "You discover a hidden path",
                            "risk_level": "low",
                        },
                        {
                            "label": "Flee",
                            "consequence": "You escape safely",
                            "risk_level": "low",
                        },
                    ],
                }
            )
        if "evaluate" in prompt.lower() or "session" in prompt.lower():
            return json.dumps(
                {
                    "difficulty_adjustment": 0.2,
                    "recommendations": ["Increase enemy density"],
                    "engagement_score": 0.75,
                }
            )
        if "recommend" in prompt.lower():
            return json.dumps(
                {
                    "recommendations": [
                        {
                            "content_type": "dungeon",
                            "content_id": "dungeon_1",
                            "reason": "Matches play style",
                            "priority": 8,
                        }
                    ]
                }
            )
        return "{}"


def _mock_content_pool():
    """Create a mock ContentPool that behaves like an empty pool."""
    pool = AsyncMock()
    pool.get = AsyncMock(return_value=None)
    pool.add = AsyncMock()
    pool.pool_size = AsyncMock(return_value=0)
    pool.pool_status = AsyncMock(return_value={})
    pool.needs_replenish = AsyncMock(return_value=True)
    pool.connect = AsyncMock()
    pool.disconnect = AsyncMock()
    return pool


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def client():
    mock_pool = _mock_content_pool()

    with patch(
        "app.main.get_llm_client", return_value=MockLLMClient()
    ), patch(
        "app.main.ContentPool", return_value=mock_pool
    ):
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as ac:
            yield ac
