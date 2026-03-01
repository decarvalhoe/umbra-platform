import json
from unittest.mock import AsyncMock, patch, PropertyMock

import pytest

from app.services.content_pool import ContentPool, CONTENT_TTL


@pytest.fixture
def mock_redis():
    r = AsyncMock()
    r.rpush = AsyncMock()
    r.lpop = AsyncMock(return_value=None)
    r.llen = AsyncMock(return_value=0)
    r.ttl = AsyncMock(return_value=-1)
    r.expire = AsyncMock()
    r.delete = AsyncMock(return_value=1)
    r.close = AsyncMock()

    async def _scan_iter(match=None):
        for key in []:
            yield key

    r.scan_iter = _scan_iter
    return r


@pytest.fixture
def pool(mock_redis):
    p = ContentPool(redis_url="redis://localhost:6379/0")
    p._redis = mock_redis
    return p


class TestContentPool:
    @pytest.mark.asyncio
    async def test_pool_add_and_get(self, pool, mock_redis):
        content = {"title": "Test Quest", "description": "A test."}
        await pool.add("quest", content, difficulty="normal")

        mock_redis.rpush.assert_called_once()
        call_args = mock_redis.rpush.call_args
        assert call_args[0][0] == "pool:quest:normal:1-50"
        assert json.loads(call_args[0][1]) == content

        mock_redis.lpop.return_value = json.dumps(content)
        result = await pool.get("quest", difficulty="normal")
        assert result == content

    @pytest.mark.asyncio
    async def test_pool_empty_returns_none(self, pool, mock_redis):
        mock_redis.lpop.return_value = None
        result = await pool.get("quest")
        assert result is None

    @pytest.mark.asyncio
    async def test_pool_needs_replenish(self, pool, mock_redis):
        mock_redis.llen.return_value = 5
        assert await pool.needs_replenish("quest") is True

        mock_redis.llen.return_value = 25
        assert await pool.needs_replenish("quest") is False

    @pytest.mark.asyncio
    async def test_pool_status(self, pool, mock_redis):
        mock_redis.llen.return_value = 3
        status = await pool.pool_status()

        assert "quest:normal" in status
        assert status["quest:normal"]["size"] == 3
        assert status["quest:normal"]["min_size"] == 20
        assert status["quest:normal"]["needs_replenish"] is True

    @pytest.mark.asyncio
    async def test_pool_key_format(self, pool):
        key = pool._pool_key("quest", "hard", "10-20")
        assert key == "pool:quest:hard:10-20"

        key = pool._pool_key("dungeon", "normal", "1-50")
        assert key == "pool:dungeon:normal:1-50"

    @pytest.mark.asyncio
    async def test_pool_add_sets_ttl_on_new_key(self, pool, mock_redis):
        mock_redis.ttl.return_value = -1
        await pool.add("quest", {"title": "Q"})
        mock_redis.expire.assert_called_once_with(
            "pool:quest:normal:1-50", CONTENT_TTL
        )

    @pytest.mark.asyncio
    async def test_pool_add_skips_ttl_on_existing_key(self, pool, mock_redis):
        mock_redis.ttl.return_value = 3600
        await pool.add("quest", {"title": "Q"})
        mock_redis.expire.assert_not_called()

    @pytest.mark.asyncio
    async def test_pool_not_connected_raises(self):
        pool = ContentPool(redis_url="redis://localhost:6379/0")
        with pytest.raises(RuntimeError, match="not connected"):
            await pool.get("quest")
