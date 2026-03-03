"""Celery Beat periodic task that monitors content pool levels.

Runs on a configurable interval (default: 60s) and triggers content
pre-generation when any pool drops below its minimum threshold.

Rate limiting prevents LLM API abuse by capping the total number of
generations per monitoring cycle.
"""

import asyncio
import json
import logging
import time
from typing import Any

import redis as sync_redis

from app.config import settings
from app.worker import celery_app
from app.services.content_pool import ContentPool
from app.services.content_generator import ContentGenerator
from app.services.llm_client import get_llm_client
from app.models.schemas import (
    QuestGenerateRequest,
    DungeonGenerateRequest,
    NarrativeEventRequest,
)

logger = logging.getLogger(__name__)

# Redis keys for pool monitor metadata
MONITOR_META_KEY = "pool_monitor:meta"
RATE_LIMIT_KEY = "pool_monitor:generations_this_minute"


def _get_sync_redis() -> sync_redis.Redis:
    """Create a synchronous Redis client for use in Celery worker context."""
    return sync_redis.from_url(settings.redis_url, decode_responses=True)


def _get_generator() -> ContentGenerator:
    """Create a fresh ContentGenerator for the worker process."""
    llm = get_llm_client(settings.llm_provider, settings.llm_model)
    return ContentGenerator(llm)


# -- Generation helpers per pool type ------------------------------------------

async def _generate_quest_easy(generator: ContentGenerator) -> dict:
    """Generate an easy quest for pool replenishment."""
    request = QuestGenerateRequest(
        player_level=5,
        player_class="shadow_warrior",
        current_zone="whispering_woods",
        difficulty="easy",
    )
    result = await generator.generate_quest(request)
    return result.model_dump()


async def _generate_quest_medium(generator: ContentGenerator) -> dict:
    """Generate a medium quest for pool replenishment."""
    request = QuestGenerateRequest(
        player_level=18,
        player_class="shadow_warrior",
        current_zone="ashen_wastes",
        difficulty="normal",
    )
    result = await generator.generate_quest(request)
    return result.model_dump()


async def _generate_dungeon_5room(generator: ContentGenerator) -> dict:
    """Generate a 5-room dungeon for pool replenishment."""
    request = DungeonGenerateRequest(
        floor_level=3,
        corruption=0.2,
        player_level=10,
    )
    result = await generator.generate_dungeon(request)
    return result.model_dump()


async def _generate_dungeon_10room(generator: ContentGenerator) -> dict:
    """Generate a 10-room dungeon for pool replenishment."""
    request = DungeonGenerateRequest(
        floor_level=7,
        corruption=0.5,
        player_level=20,
    )
    result = await generator.generate_dungeon(request)
    return result.model_dump()


async def _generate_narrative_choice(generator: ContentGenerator) -> dict:
    """Generate a narrative choice event for pool replenishment."""
    request = NarrativeEventRequest(
        event_type="choice",
        player_context={"level": 10, "zone": "twilight_ruins"},
        current_zone="twilight_ruins",
    )
    result = await generator.generate_narrative_event(request)
    return result.model_dump()


# Map pool keys to their generation coroutine factory
POOL_GENERATORS: dict[str, Any] = {
    "pool:quests:easy": _generate_quest_easy,
    "pool:quests:medium": _generate_quest_medium,
    "pool:dungeons:5room": _generate_dungeon_5room,
    "pool:dungeons:10room": _generate_dungeon_10room,
    "pool:narratives:choice": _generate_narrative_choice,
}


def _check_rate_limit(r: sync_redis.Redis, limit: int) -> int:
    """Return the number of remaining generations allowed this minute.

    Uses a Redis key with a 60-second TTL as a sliding window counter.
    """
    current = r.get(RATE_LIMIT_KEY)
    if current is None:
        return limit
    return max(0, limit - int(current))


def _increment_rate_counter(r: sync_redis.Redis) -> None:
    """Increment the generation counter. Sets a 60s TTL on first use."""
    pipe = r.pipeline()
    pipe.incr(RATE_LIMIT_KEY)
    pipe.expire(RATE_LIMIT_KEY, 60)
    pipe.execute()


def _update_monitor_meta(
    r: sync_redis.Redis,
    pool_key: str,
    generated_count: int,
) -> None:
    """Update the pool monitor metadata in Redis."""
    now = time.time()
    r.hset(MONITOR_META_KEY, f"{pool_key}:last_generation_time", str(now))
    r.hincrby(MONITOR_META_KEY, f"{pool_key}:total_generated", generated_count)
    r.hset(MONITOR_META_KEY, "last_run_time", str(now))


@celery_app.task(name="monitor_pool_levels", bind=True, max_retries=1)
def monitor_pool_levels(self) -> dict:
    """Check all content pools and generate items for those below threshold.

    This is the Celery Beat periodic task. It:
    1. Connects to Redis and checks each pool's current size
    2. Compares against configured thresholds
    3. Generates content to fill pools back up, respecting rate limits
    4. Records metadata (last generation time, counts) for health reporting
    """
    r = _get_sync_redis()
    thresholds = settings.get_pool_thresholds()
    rate_limit = settings.pool_generation_rate_limit
    total_generated = 0
    pool_report: dict[str, dict] = {}

    for pool_key, threshold in thresholds.items():
        current_size = r.llen(pool_key)
        deficit = max(0, threshold - current_size)

        pool_report[pool_key] = {
            "current_size": current_size,
            "threshold": threshold,
            "deficit": deficit,
            "generated": 0,
        }

        if deficit == 0:
            logger.debug("Pool %s is healthy (%d/%d)", pool_key, current_size, threshold)
            continue

        remaining = _check_rate_limit(r, rate_limit)
        to_generate = min(deficit, remaining)

        if to_generate == 0:
            logger.warning(
                "Pool %s needs %d items but rate limit reached (%d/min)",
                pool_key,
                deficit,
                rate_limit,
            )
            continue

        gen_func = POOL_GENERATORS.get(pool_key)
        if gen_func is None:
            logger.error("No generator registered for pool %s", pool_key)
            continue

        generator = _get_generator()
        generated_this_pool = 0

        for _ in range(to_generate):
            # Re-check rate limit before each generation
            if _check_rate_limit(r, rate_limit) <= 0:
                logger.warning("Rate limit hit during generation for %s", pool_key)
                break

            try:
                content = asyncio.run(gen_func(generator))
                # Push to the Redis list (same format as ContentPool.push)
                item = json.dumps({"content": content, "created_at": time.time()})
                r.lpush(pool_key, item)
                _increment_rate_counter(r)
                generated_this_pool += 1
                total_generated += 1
            except Exception as exc:
                logger.error(
                    "Failed to generate content for %s: %s",
                    pool_key,
                    exc,
                )
                break

        pool_report[pool_key]["generated"] = generated_this_pool
        if generated_this_pool > 0:
            _update_monitor_meta(r, pool_key, generated_this_pool)
            logger.info(
                "Generated %d items for %s (was %d/%d)",
                generated_this_pool,
                pool_key,
                current_size,
                threshold,
            )

    # Update overall last-run timestamp
    r.hset(MONITOR_META_KEY, "last_run_time", str(time.time()))

    logger.info(
        "Pool monitor cycle complete: %d items generated across %d pools",
        total_generated,
        len(thresholds),
    )

    r.close()
    return {
        "total_generated": total_generated,
        "pools": pool_report,
    }
