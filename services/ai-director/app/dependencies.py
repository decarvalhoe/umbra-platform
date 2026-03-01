from fastapi import Request

import redis.asyncio as redis

from app.config import settings
from app.services.content_pool import ContentPool


async def get_redis(request: Request) -> redis.Redis:
    """Return the shared async Redis client from app state."""
    return request.app.state.redis


async def get_content_pool(request: Request) -> ContentPool:
    """Return the shared ContentPool instance from app state."""
    return request.app.state.content_pool
