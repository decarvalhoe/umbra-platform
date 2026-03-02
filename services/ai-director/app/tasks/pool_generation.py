"""Celery tasks for pre-generating content and storing it in Redis pools.

These tasks generate dungeon narratives, enemy encounters, and loot tables
using the LLM provider abstraction, then push results into Redis content
pools for later retrieval.

Batch generation is supported: a single task can fill an entire pool up to
its configured threshold, respecting the global rate limit.
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
from app.tasks.pool_monitor import (
    _check_rate_limit,
    _increment_rate_counter,
    _update_monitor_meta,
    RATE_LIMIT_KEY,
)

logger = logging.getLogger(__name__)


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

# Map content_type shorthand to pool key
CONTENT_TYPE_TO_POOL_KEY: dict[str, str] = {
    "quests_easy": "pool:quests:easy",
    "quests_medium": "pool:quests:medium",
    "dungeons_5room": "pool:dungeons:5room",
    "dungeons_10room": "pool:dungeons:10room",
    "narratives_choice": "pool:narratives:choice",
}


@celery_app.task(name="generate_and_store", bind=True, max_retries=2)
def generate_and_store(self, pool_key: str) -> dict:
    """Generate a single content item and push it to the Redis pool.

    Args:
        pool_key: The Redis pool key (e.g. "pool:quests:easy").

    Returns:
        Dict with the generated content and pool key.
    """
    gen_func = POOL_GENERATORS.get(pool_key)
    if gen_func is None:
        raise ValueError(f"No generator registered for pool: {pool_key}")

    r = _get_sync_redis()
    rate_limit = settings.pool_generation_rate_limit

    # Check rate limit before generating
    remaining = _check_rate_limit(r, rate_limit)
    if remaining <= 0:
        r.close()
        return {
            "pool_key": pool_key,
            "generated": False,
            "reason": "rate_limit_exceeded",
        }

    generator = _get_generator()

    try:
        content = asyncio.run(gen_func(generator))
        item = json.dumps({"content": content, "created_at": time.time()})
        r.lpush(pool_key, item)
        _increment_rate_counter(r)
        _update_monitor_meta(r, pool_key, 1)

        logger.info("Generated and stored 1 item in %s", pool_key)
        return {
            "pool_key": pool_key,
            "generated": True,
            "content": content,
        }
    except Exception as exc:
        logger.error("Failed to generate content for %s: %s", pool_key, exc)
        raise self.retry(exc=exc, countdown=5)
    finally:
        r.close()


@celery_app.task(name="batch_generate_pool", bind=True, max_retries=1)
def batch_generate_pool(self, pool_key: str, count: int | None = None) -> dict:
    """Generate multiple content items to fill a pool up to its threshold.

    If count is not specified, generates enough items to reach the
    configured threshold for the pool.

    Args:
        pool_key: The Redis pool key (e.g. "pool:quests:easy").
        count: Optional explicit number of items to generate.

    Returns:
        Dict with generation stats.
    """
    gen_func = POOL_GENERATORS.get(pool_key)
    if gen_func is None:
        raise ValueError(f"No generator registered for pool: {pool_key}")

    r = _get_sync_redis()
    thresholds = settings.get_pool_thresholds()
    rate_limit = settings.pool_generation_rate_limit

    current_size = r.llen(pool_key)
    threshold = thresholds.get(pool_key, 10)

    if count is None:
        count = max(0, threshold - current_size)

    if count == 0:
        r.close()
        return {
            "pool_key": pool_key,
            "current_size": current_size,
            "threshold": threshold,
            "generated": 0,
            "reason": "pool_at_threshold",
        }

    generator = _get_generator()
    generated = 0

    for _ in range(count):
        remaining = _check_rate_limit(r, rate_limit)
        if remaining <= 0:
            logger.warning(
                "Rate limit reached during batch generation for %s (%d/%d generated)",
                pool_key,
                generated,
                count,
            )
            break

        try:
            content = asyncio.run(gen_func(generator))
            item = json.dumps({"content": content, "created_at": time.time()})
            r.lpush(pool_key, item)
            _increment_rate_counter(r)
            generated += 1
        except Exception as exc:
            logger.error(
                "Failed to generate content for %s (item %d/%d): %s",
                pool_key,
                generated + 1,
                count,
                exc,
            )
            break

    if generated > 0:
        _update_monitor_meta(r, pool_key, generated)

    final_size = r.llen(pool_key)
    logger.info(
        "Batch generation for %s: %d/%d items generated (pool: %d -> %d)",
        pool_key,
        generated,
        count,
        current_size,
        final_size,
    )

    r.close()
    return {
        "pool_key": pool_key,
        "current_size": final_size,
        "threshold": threshold,
        "requested": count,
        "generated": generated,
    }


@celery_app.task(name="generate_on_demand", bind=True, max_retries=2)
def generate_on_demand(self, pool_key: str) -> dict:
    """Generate a single content item on demand (no pool storage).

    Used as a fallback when a pool is empty and the caller needs
    content immediately. The content is returned directly rather
    than being pushed into the pool.

    Args:
        pool_key: The pool key that identifies the content type.

    Returns:
        Dict with the generated content.
    """
    gen_func = POOL_GENERATORS.get(pool_key)
    if gen_func is None:
        raise ValueError(f"No generator registered for pool: {pool_key}")

    generator = _get_generator()

    try:
        content = asyncio.run(gen_func(generator))
        return {
            "pool_key": pool_key,
            "content": content,
            "source": "on_demand",
        }
    except Exception as exc:
        logger.error("On-demand generation failed for %s: %s", pool_key, exc)
        raise self.retry(exc=exc, countdown=5)
