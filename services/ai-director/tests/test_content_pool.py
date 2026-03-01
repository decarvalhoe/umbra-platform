import pytest
import pytest_asyncio
import fakeredis.aioredis

from app.services.content_pool import ContentPool


@pytest_asyncio.fixture
async def redis_client():
    """Create a fakeredis async client for testing."""
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


@pytest_asyncio.fixture
async def pool(redis_client):
    """Create a ContentPool backed by fakeredis."""
    return ContentPool(redis_client)


@pytest.mark.asyncio
async def test_push_and_pop(pool):
    """Test basic push and pop operations."""
    content = {"title": "Test Quest", "difficulty": "easy"}
    await pool.push("pool:quests:easy", content)

    result = await pool.pop("pool:quests:easy")
    assert result == content


@pytest.mark.asyncio
async def test_pop_empty_pool(pool):
    """Test popping from an empty pool returns None."""
    result = await pool.pop("pool:quests:easy")
    assert result is None


@pytest.mark.asyncio
async def test_size(pool):
    """Test size reports correct item count."""
    assert await pool.size("pool:quests:easy") == 0

    await pool.push("pool:quests:easy", {"item": 1})
    assert await pool.size("pool:quests:easy") == 1

    await pool.push("pool:quests:easy", {"item": 2})
    assert await pool.size("pool:quests:easy") == 2

    await pool.pop("pool:quests:easy")
    assert await pool.size("pool:quests:easy") == 1


@pytest.mark.asyncio
async def test_needs_replenishment(pool):
    """Test replenishment detection based on min_size threshold."""
    assert await pool.needs_replenishment("pool:quests:easy") is True

    for i in range(20):
        await pool.push("pool:quests:easy", {"item": i})

    assert await pool.needs_replenishment("pool:quests:easy") is False


@pytest.mark.asyncio
async def test_needs_replenishment_unknown_pool(pool):
    """Test replenishment check for unknown pool uses default min_size of 10."""
    assert await pool.needs_replenishment("pool:unknown:type") is True


@pytest.mark.asyncio
async def test_pools_needing_replenishment(pool):
    """Test that all configured pools start as needing replenishment."""
    needs = await pool.pools_needing_replenishment()
    assert len(needs) == len(ContentPool.POOL_CONFIG)
    for key in ContentPool.POOL_CONFIG:
        assert key in needs


@pytest.mark.asyncio
async def test_health_report(pool):
    """Test health report includes all pool types with correct structure."""
    report = await pool.health_report()

    assert len(report) == len(ContentPool.POOL_CONFIG)
    for key, config in ContentPool.POOL_CONFIG.items():
        assert key in report
        entry = report[key]
        assert entry["size"] == 0
        assert entry["min_size"] == config["min_size"]
        assert entry["healthy"] is False
        assert entry["description"] == config["description"]


@pytest.mark.asyncio
async def test_health_report_healthy_pool(pool):
    """Test health report shows healthy when pool meets minimum."""
    for i in range(5):
        await pool.push("pool:dungeons:10room", {"room": i})

    report = await pool.health_report()
    assert report["pool:dungeons:10room"]["healthy"] is True
    assert report["pool:dungeons:10room"]["size"] == 5


@pytest.mark.asyncio
async def test_fifo_order(pool):
    """Test that items are popped in FIFO order (first pushed = first popped)."""
    items = [{"order": i} for i in range(5)]

    for item in items:
        await pool.push("pool:quests:easy", item)

    for expected in items:
        result = await pool.pop("pool:quests:easy")
        assert result == expected


@pytest.mark.asyncio
async def test_flush_pool(pool):
    """Test flushing a pool removes all items and returns count."""
    for i in range(10):
        await pool.push("pool:quests:easy", {"item": i})

    count = await pool.flush_pool("pool:quests:easy")
    assert count == 10
    assert await pool.size("pool:quests:easy") == 0


@pytest.mark.asyncio
async def test_flush_empty_pool(pool):
    """Test flushing an empty pool returns 0."""
    count = await pool.flush_pool("pool:quests:easy")
    assert count == 0
