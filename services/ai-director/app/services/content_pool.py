import json
import logging

import redis.asyncio as redis

from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

CONTENT_TYPES = {
    "quest": "pool:quest",
    "dungeon": "pool:dungeon",
    "narrative": "pool:narrative",
}

DEFAULT_MIN_POOL = {
    "quest": 20,
    "dungeon": 10,
    "narrative": 15,
}

CONTENT_TTL = 86400


class ContentPool:
    """Redis-backed pool of pre-generated AI content.

    Content is stored as Redis lists. New content is pushed to the right (RPUSH),
    and content is served from the left (LPOP) — FIFO queue.
    """

    def __init__(self, redis_url: str | None = None):
        self._redis: redis.Redis | None = None
        self._redis_url = redis_url or settings.redis_url

    async def connect(self) -> None:
        self._redis = redis.from_url(self._redis_url, decode_responses=True)
        logger.info("Content pool connected to Redis")

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.close()
            self._redis = None

    @property
    def redis(self) -> redis.Redis:
        if not self._redis:
            raise RuntimeError("Content pool not connected")
        return self._redis

    async def add(
        self,
        content_type: str,
        content: dict,
        difficulty: str = "normal",
        level_range: str = "1-50",
    ) -> None:
        key = self._pool_key(content_type, difficulty, level_range)
        item = json.dumps(content)
        await self.redis.rpush(key, item)
        ttl = await self.redis.ttl(key)
        if ttl == -1:
            await self.redis.expire(key, CONTENT_TTL)
        logger.debug("Added %s to pool (key=%s)", content_type, key)

    async def get(
        self,
        content_type: str,
        difficulty: str = "normal",
        level_range: str = "1-50",
    ) -> Optional[dict]:
        key = self._pool_key(content_type, difficulty, level_range)
        item = await self.redis.lpop(key)
        if item:
            return json.loads(item)
        return None

    async def pool_size(
        self,
        content_type: str,
        difficulty: str = "normal",
        level_range: str = "1-50",
    ) -> int:
        key = self._pool_key(content_type, difficulty, level_range)
        return await self.redis.llen(key)

    async def pool_status(self) -> dict:
        status = {}
        for content_type in CONTENT_TYPES:
            for difficulty in ["easy", "normal", "hard"]:
                key = self._pool_key(content_type, difficulty)
                size = await self.redis.llen(key)
                min_size = DEFAULT_MIN_POOL.get(content_type, 10)
                status[f"{content_type}:{difficulty}"] = {
                    "size": size,
                    "min_size": min_size,
                    "needs_replenish": size < min_size,
                }
        return status

    async def needs_replenish(
        self,
        content_type: str,
        difficulty: str = "normal",
        level_range: str = "1-50",
    ) -> bool:
        size = await self.pool_size(content_type, difficulty, level_range)
        min_size = DEFAULT_MIN_POOL.get(content_type, 10)
        return size < min_size

    async def flush(self, content_type: str | None = None) -> int:
        count = 0
        pattern = f"pool:{content_type}:*" if content_type else "pool:*"
        async for key in self.redis.scan_iter(match=pattern):
            deleted = await self.redis.delete(key)
            count += deleted
        logger.info("Flushed %d pool keys (pattern=%s)", count, pattern)
        return count

    def _pool_key(
        self,
        content_type: str,
        difficulty: str = "normal",
        level_range: str = "1-50",
    ) -> str:
        prefix = CONTENT_TYPES.get(content_type, f"pool:{content_type}")
        return f"{prefix}:{difficulty}:{level_range}"
