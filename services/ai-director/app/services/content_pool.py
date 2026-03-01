import json
import time
from typing import Optional, Dict, Any, List

import redis.asyncio as redis


class ContentPool:
    """Redis-backed content pool for pre-generated AI content.

    Uses Redis Lists (LPUSH/RPOP) for O(1) push/pop operations.
    Each pool key has a minimum size threshold for auto-replenishment.
    """

    POOL_CONFIG = {
        "pool:quests:easy": {
            "min_size": 20,
            "ttl": 86400,
            "description": "Quests for levels 1-10",
        },
        "pool:quests:medium": {
            "min_size": 15,
            "ttl": 86400,
            "description": "Quests for levels 11-25",
        },
        "pool:dungeons:5room": {
            "min_size": 10,
            "ttl": 86400,
            "description": "5-room dungeon layouts",
        },
        "pool:dungeons:10room": {
            "min_size": 5,
            "ttl": 86400,
            "description": "10-room dungeon layouts",
        },
        "pool:narratives:choice": {
            "min_size": 15,
            "ttl": 86400,
            "description": "Narrative choice events",
        },
    }

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def push(
        self, pool_key: str, content: dict, ttl_seconds: int = 86400
    ) -> None:
        """Add pre-generated content to the pool."""
        item = json.dumps({"content": content, "created_at": time.time()})
        await self.redis.lpush(pool_key, item)
        if await self.redis.ttl(pool_key) == -1:
            await self.redis.expire(pool_key, ttl_seconds)

    async def pop(self, pool_key: str) -> Optional[dict]:
        """Get content from the pool (FIFO). Returns None if empty."""
        item = await self.redis.rpop(pool_key)
        if item:
            parsed = json.loads(item)
            return parsed.get("content", parsed)
        return None

    async def size(self, pool_key: str) -> int:
        """Return the number of items in a pool."""
        return await self.redis.llen(pool_key)

    async def needs_replenishment(self, pool_key: str) -> bool:
        """Check if a pool is below its minimum size threshold."""
        config = self.POOL_CONFIG.get(pool_key, {})
        min_size = config.get("min_size", 10)
        current = await self.size(pool_key)
        return current < min_size

    async def pools_needing_replenishment(self) -> List[str]:
        """Return list of pool keys that are below minimum size."""
        result = []
        for key in self.POOL_CONFIG:
            if await self.needs_replenishment(key):
                result.append(key)
        return result

    async def health_report(self) -> Dict[str, Any]:
        """Returns pool sizes and health status for /health endpoint."""
        report = {}
        for key, config in self.POOL_CONFIG.items():
            current_size = await self.size(key)
            report[key] = {
                "size": current_size,
                "min_size": config["min_size"],
                "healthy": current_size >= config["min_size"],
                "description": config["description"],
            }
        return report

    async def flush_pool(self, pool_key: str) -> int:
        """Remove all items from a pool. Returns number of items removed."""
        count = await self.size(pool_key)
        await self.redis.delete(pool_key)
        return count
