"""Content retrieval endpoint with pre-generated pool and on-demand fallback.

Provides GET /api/v1/content/pool/{content_type} that:
1. Pops pre-generated content from the Redis pool
2. If pool is empty, generates content on-demand as fallback
3. Optionally triggers async batch replenishment when pool is low
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.dependencies import get_content_pool
from app.services.content_pool import ContentPool
from app.services.content_generator import ContentGenerator
from app.tasks.pool_generation import (
    CONTENT_TYPE_TO_POOL_KEY,
    POOL_GENERATORS,
    batch_generate_pool,
)
from app.models.schemas import (
    QuestGenerateRequest,
    DungeonGenerateRequest,
    NarrativeEventRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/content", tags=["content"])


def _get_generator(request: Request) -> ContentGenerator:
    return request.app.state.content_generator


# -- On-demand fallback generators (async, for use in FastAPI context) ---------

async def _fallback_quests_easy(generator: ContentGenerator) -> dict:
    request = QuestGenerateRequest(
        player_level=5,
        player_class="shadow_warrior",
        current_zone="whispering_woods",
        difficulty="easy",
    )
    result = await generator.generate_quest(request)
    return result.model_dump()


async def _fallback_quests_medium(generator: ContentGenerator) -> dict:
    request = QuestGenerateRequest(
        player_level=18,
        player_class="shadow_warrior",
        current_zone="ashen_wastes",
        difficulty="normal",
    )
    result = await generator.generate_quest(request)
    return result.model_dump()


async def _fallback_dungeons_5room(generator: ContentGenerator) -> dict:
    request = DungeonGenerateRequest(
        floor_level=3,
        corruption=0.2,
        player_level=10,
    )
    result = await generator.generate_dungeon(request)
    return result.model_dump()


async def _fallback_dungeons_10room(generator: ContentGenerator) -> dict:
    request = DungeonGenerateRequest(
        floor_level=7,
        corruption=0.5,
        player_level=20,
    )
    result = await generator.generate_dungeon(request)
    return result.model_dump()


async def _fallback_narratives_choice(generator: ContentGenerator) -> dict:
    request = NarrativeEventRequest(
        event_type="choice",
        player_context={"level": 10, "zone": "twilight_ruins"},
        current_zone="twilight_ruins",
    )
    result = await generator.generate_narrative_event(request)
    return result.model_dump()


FALLBACK_GENERATORS = {
    "pool:quests:easy": _fallback_quests_easy,
    "pool:quests:medium": _fallback_quests_medium,
    "pool:dungeons:5room": _fallback_dungeons_5room,
    "pool:dungeons:10room": _fallback_dungeons_10room,
    "pool:narratives:choice": _fallback_narratives_choice,
}


@router.get("/pool/{content_type}")
async def get_pool_content(
    content_type: str,
    request: Request,
    pool: ContentPool = Depends(get_content_pool),
):
    """Retrieve pre-generated content from a pool.

    Pops the next item from the specified content pool. If the pool is
    empty, generates content on-demand using the LLM as a fallback.

    After serving content, if the pool drops below its threshold, an
    async batch replenishment task is dispatched.

    Args:
        content_type: Content type identifier. One of:
            quests_easy, quests_medium, dungeons_5room,
            dungeons_10room, narratives_choice.
    """
    pool_key = CONTENT_TYPE_TO_POOL_KEY.get(content_type)
    if pool_key is None:
        valid_types = sorted(CONTENT_TYPE_TO_POOL_KEY.keys())
        raise HTTPException(
            status_code=404,
            detail=f"Unknown content type: {content_type}. "
            f"Valid types: {valid_types}",
        )

    # Try to pop from the pre-generated pool
    content = await pool.pop(pool_key)

    if content is not None:
        source = "pool"
    else:
        # Fallback: generate on-demand
        logger.warning(
            "Pool %s empty, generating on-demand for content_type=%s",
            pool_key,
            content_type,
        )
        fallback = FALLBACK_GENERATORS.get(pool_key)
        if fallback is None:
            raise HTTPException(
                status_code=500,
                detail=f"No fallback generator for pool: {pool_key}",
            )
        generator = _get_generator(request)
        content = await fallback(generator)
        source = "on_demand"

    # Trigger async replenishment if pool is below threshold
    if await pool.needs_replenishment(pool_key):
        try:
            batch_generate_pool.delay(pool_key)
            logger.info(
                "Dispatched batch replenishment for %s (below threshold)",
                pool_key,
            )
        except Exception:
            logger.warning(
                "Failed to dispatch replenishment task for %s", pool_key
            )

    return {
        "content_type": content_type,
        "content": content,
        "source": source,
        "pool_key": pool_key,
    }


@router.get("/types")
async def list_content_types():
    """List all available content types and their pool keys."""
    result = []
    for content_type, pool_key in sorted(CONTENT_TYPE_TO_POOL_KEY.items()):
        config = ContentPool.POOL_CONFIG.get(pool_key, {})
        result.append({
            "content_type": content_type,
            "pool_key": pool_key,
            "description": config.get("description", ""),
            "min_size": config.get("min_size", 0),
        })
    return {"content_types": result}


@router.post("/pool/{content_type}/replenish")
async def trigger_replenishment(
    content_type: str,
    count: int | None = None,
    pool: ContentPool = Depends(get_content_pool),
):
    """Manually trigger batch replenishment for a content pool.

    Args:
        content_type: Content type identifier.
        count: Optional number of items to generate. If omitted,
            fills up to the configured threshold.
    """
    pool_key = CONTENT_TYPE_TO_POOL_KEY.get(content_type)
    if pool_key is None:
        valid_types = sorted(CONTENT_TYPE_TO_POOL_KEY.keys())
        raise HTTPException(
            status_code=404,
            detail=f"Unknown content type: {content_type}. "
            f"Valid types: {valid_types}",
        )

    current_size = await pool.size(pool_key)
    result = batch_generate_pool.delay(pool_key, count)

    return {
        "task_id": result.id,
        "status": "dispatched",
        "pool_key": pool_key,
        "current_size": current_size,
        "requested_count": count,
    }
