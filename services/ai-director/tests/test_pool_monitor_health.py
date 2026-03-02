"""Tests for the pool monitor health API endpoint."""

import pytest
import pytest_asyncio
import fakeredis.aioredis

from httpx import ASGITransport, AsyncClient

from app.services.content_pool import ContentPool
from app.tasks.pool_monitor import MONITOR_META_KEY, RATE_LIMIT_KEY


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


@pytest.mark.asyncio
async def test_monitor_health_endpoint_empty_pools(client):
    """Monitor health endpoint returns correct structure when pools are empty."""
    response = await client.get("/api/v1/pool/monitor/health")
    assert response.status_code == 200

    data = response.json()
    assert "pools" in data
    assert "monitor" in data

    # Check monitor section
    monitor = data["monitor"]
    assert "last_run_time" in monitor
    assert monitor["last_run_time"] is None  # No monitor has run yet
    assert monitor["schedule_interval_seconds"] == 60
    assert monitor["rate_limit_per_minute"] == 10
    assert monitor["current_rate_usage"] == 0

    # Check pools section -- all should be unhealthy (empty)
    for pool_key, pool_data in data["pools"].items():
        assert pool_data["size"] == 0
        assert pool_data["healthy"] is False
        assert "threshold" in pool_data
        assert "last_generation_time" in pool_data
        assert "total_generated" in pool_data


@pytest.mark.asyncio
async def test_monitor_health_with_metadata(client, redis_client):
    """Monitor health includes stored metadata from previous monitor runs."""
    # Simulate monitor metadata
    await redis_client.hset(
        MONITOR_META_KEY, "last_run_time", "1700000000.0"
    )
    await redis_client.hset(
        MONITOR_META_KEY, "pool:quests:easy:last_generation_time", "1700000000.0"
    )
    await redis_client.hset(
        MONITOR_META_KEY, "pool:quests:easy:total_generated", "42"
    )
    # Simulate rate counter
    await redis_client.set(RATE_LIMIT_KEY, "7")

    response = await client.get("/api/v1/pool/monitor/health")
    assert response.status_code == 200

    data = response.json()

    assert data["monitor"]["last_run_time"] == 1700000000.0
    assert data["monitor"]["current_rate_usage"] == 7

    quests_easy = data["pools"]["pool:quests:easy"]
    assert quests_easy["last_generation_time"] == 1700000000.0
    assert quests_easy["total_generated"] == 42


@pytest.mark.asyncio
async def test_pool_health_endpoint_still_works(client):
    """Original /health endpoint is unaffected."""
    response = await client.get("/api/v1/pool/health")
    assert response.status_code == 200
    data = response.json()
    # Original format: pool_key -> {size, min_size, healthy, description}
    assert "pool:quests:easy" in data
    assert "size" in data["pool:quests:easy"]
