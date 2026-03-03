"""Tests for the content retrieval endpoint (GET /api/v1/content/pool/{content_type})."""

import json
import time
from unittest.mock import patch

import pytest
import pytest_asyncio
import fakeredis.aioredis

from httpx import ASGITransport, AsyncClient

from app.services.content_pool import ContentPool
from app.tasks.pool_generation import CONTENT_TYPE_TO_POOL_KEY


@pytest_asyncio.fixture
async def redis_client():
    """Create a fakeredis async client for testing."""
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


@pytest_asyncio.fixture
async def client(redis_client):
    from app.main import app
    from app.services.content_generator import ContentGenerator
    from tests.conftest import MockLLMClient

    mock_llm = MockLLMClient()
    app.state.content_generator = ContentGenerator(mock_llm)
    app.state.redis = redis_client
    app.state.content_pool = ContentPool(redis_client)

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# GET /api/v1/content/pool/{content_type}
# ---------------------------------------------------------------------------


class TestGetPoolContent:
    @pytest.mark.asyncio
    async def test_returns_from_pool_when_available(self, client, redis_client):
        """Content is popped from the pool when items exist."""
        # Pre-fill pool with enough items to be above threshold
        for i in range(25):
            item = json.dumps({
                "content": {"quest_id": f"q-{i}", "title": f"Quest {i}"},
                "created_at": time.time(),
            })
            await redis_client.lpush("pool:quests:easy", item)

        response = await client.get("/api/v1/content/pool/quests_easy")
        assert response.status_code == 200

        data = response.json()
        assert data["content_type"] == "quests_easy"
        assert data["source"] == "pool"
        assert data["pool_key"] == "pool:quests:easy"
        assert "content" in data

    @pytest.mark.asyncio
    @patch("app.api.content.batch_generate_pool")
    async def test_on_demand_fallback_when_pool_empty(
        self, mock_batch, client, redis_client
    ):
        """When pool is empty, content is generated on demand."""
        mock_batch.delay = lambda *a, **kw: None

        response = await client.get("/api/v1/content/pool/quests_easy")
        assert response.status_code == 200

        data = response.json()
        assert data["source"] == "on_demand"
        assert data["content_type"] == "quests_easy"
        assert "content" in data
        # On-demand quest should have quest fields
        assert "title" in data["content"]

    @pytest.mark.asyncio
    @patch("app.api.content.batch_generate_pool")
    async def test_dungeon_on_demand_fallback(self, mock_batch, client, redis_client):
        """Dungeon on-demand fallback generates valid dungeon content."""
        mock_batch.delay = lambda *a, **kw: None

        response = await client.get("/api/v1/content/pool/dungeons_5room")
        assert response.status_code == 200

        data = response.json()
        assert data["source"] == "on_demand"
        assert "rooms" in data["content"]

    @pytest.mark.asyncio
    @patch("app.api.content.batch_generate_pool")
    async def test_narrative_on_demand_fallback(self, mock_batch, client, redis_client):
        """Narrative on-demand fallback generates valid narrative content."""
        mock_batch.delay = lambda *a, **kw: None

        response = await client.get("/api/v1/content/pool/narratives_choice")
        assert response.status_code == 200

        data = response.json()
        assert data["source"] == "on_demand"
        assert "narrative" in data["content"]

    @pytest.mark.asyncio
    async def test_unknown_content_type_returns_404(self, client):
        """Unknown content type returns 404 with valid types listed."""
        response = await client.get("/api/v1/content/pool/invalid_type")
        assert response.status_code == 404

        data = response.json()
        assert "Unknown content type" in data["detail"]
        assert "quests_easy" in data["detail"]

    @pytest.mark.asyncio
    @patch("app.api.content.batch_generate_pool")
    async def test_triggers_replenishment_when_pool_low(
        self, mock_batch, client, redis_client
    ):
        """When pool drops below threshold after pop, replenishment is dispatched."""
        mock_task = type("MockResult", (), {"id": "test-task-id"})()
        mock_batch.delay.return_value = mock_task

        # Add just one item (well below threshold of 20)
        item = json.dumps({
            "content": {"quest_id": "q-1", "title": "Lone Quest"},
            "created_at": time.time(),
        })
        await redis_client.lpush("pool:quests:easy", item)

        response = await client.get("/api/v1/content/pool/quests_easy")
        assert response.status_code == 200

        # batch_generate_pool.delay should have been called
        mock_batch.delay.assert_called_once_with("pool:quests:easy")

    @pytest.mark.asyncio
    async def test_no_replenishment_when_pool_healthy(self, client, redis_client):
        """When pool is above threshold, no replenishment is dispatched."""
        # Fill above threshold (20)
        for i in range(25):
            item = json.dumps({
                "content": {"quest_id": f"q-{i}", "title": f"Quest {i}"},
                "created_at": time.time(),
            })
            await redis_client.lpush("pool:quests:easy", item)

        with patch("app.api.content.batch_generate_pool") as mock_batch:
            response = await client.get("/api/v1/content/pool/quests_easy")
            assert response.status_code == 200
            # Pool still has 24 items (above 20), no replenishment
            mock_batch.delay.assert_not_called()

    @pytest.mark.asyncio
    async def test_pool_item_removed_after_pop(self, client, redis_client):
        """After content is retrieved, it's removed from the pool."""
        for i in range(25):
            item = json.dumps({
                "content": {"quest_id": f"q-{i}"},
                "created_at": time.time(),
            })
            await redis_client.lpush("pool:quests:easy", item)

        initial_size = await redis_client.llen("pool:quests:easy")
        await client.get("/api/v1/content/pool/quests_easy")
        final_size = await redis_client.llen("pool:quests:easy")

        assert final_size == initial_size - 1


# ---------------------------------------------------------------------------
# GET /api/v1/content/types
# ---------------------------------------------------------------------------


class TestListContentTypes:
    @pytest.mark.asyncio
    async def test_lists_all_content_types(self, client):
        """Types endpoint returns all configured content types."""
        response = await client.get("/api/v1/content/types")
        assert response.status_code == 200

        data = response.json()
        assert "content_types" in data
        types = {t["content_type"] for t in data["content_types"]}
        assert types == set(CONTENT_TYPE_TO_POOL_KEY.keys())

    @pytest.mark.asyncio
    async def test_content_type_structure(self, client):
        """Each content type entry has expected fields."""
        response = await client.get("/api/v1/content/types")
        data = response.json()

        for entry in data["content_types"]:
            assert "content_type" in entry
            assert "pool_key" in entry
            assert "description" in entry
            assert "min_size" in entry


# ---------------------------------------------------------------------------
# POST /api/v1/content/pool/{content_type}/replenish
# ---------------------------------------------------------------------------


class TestTriggerReplenishment:
    @pytest.mark.asyncio
    @patch("app.api.content.batch_generate_pool")
    async def test_dispatches_batch_task(self, mock_batch, client):
        """Replenishment endpoint dispatches a batch generation task."""
        mock_task = type("MockResult", (), {"id": "test-task-id"})()
        mock_batch.delay.return_value = mock_task

        response = await client.post("/api/v1/content/pool/quests_easy/replenish")
        assert response.status_code == 200

        data = response.json()
        assert data["task_id"] == "test-task-id"
        assert data["status"] == "dispatched"
        assert data["pool_key"] == "pool:quests:easy"
        mock_batch.delay.assert_called_once_with("pool:quests:easy", None)

    @pytest.mark.asyncio
    @patch("app.api.content.batch_generate_pool")
    async def test_dispatches_with_count(self, mock_batch, client):
        """Replenishment with explicit count passes it to the task."""
        mock_task = type("MockResult", (), {"id": "test-task-id"})()
        mock_batch.delay.return_value = mock_task

        response = await client.post(
            "/api/v1/content/pool/quests_easy/replenish?count=3"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["requested_count"] == 3
        mock_batch.delay.assert_called_once_with("pool:quests:easy", 3)

    @pytest.mark.asyncio
    async def test_unknown_content_type_returns_404(self, client):
        """Unknown content type returns 404."""
        response = await client.post(
            "/api/v1/content/pool/invalid_type/replenish"
        )
        assert response.status_code == 404
