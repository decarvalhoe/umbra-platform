from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

import redis.asyncio as aioredis

from app.dependencies import get_content_pool, get_redis
from app.services.content_pool import ContentPool
from app.config import settings
from app.tasks.pool_monitor import MONITOR_META_KEY, RATE_LIMIT_KEY

router = APIRouter(prefix="/api/v1/pool", tags=["content-pool"])


@router.get("/health")
async def pool_health(pool: ContentPool = Depends(get_content_pool)):
    """Get health report for all content pools."""
    return await pool.health_report()


@router.get("/status")
async def pool_status(pool: ContentPool = Depends(get_content_pool)):
    """Get pools needing replenishment."""
    needs = await pool.pools_needing_replenishment()
    return {"pools_needing_replenishment": needs}


@router.get("/monitor/health")
async def pool_monitor_health(
    pool: ContentPool = Depends(get_content_pool),
    redis_client: aioredis.Redis = Depends(get_redis),
):
    """Extended health endpoint with pool monitor metadata.

    Returns pool sizes, thresholds, last generation timestamps,
    and current generation rate for operational monitoring.
    """
    # Base pool health report
    pool_report = await pool.health_report()

    # Fetch monitor metadata from Redis
    meta = await redis_client.hgetall(MONITOR_META_KEY)

    # Current rate counter
    rate_current = await redis_client.get(RATE_LIMIT_KEY)
    rate_current = int(rate_current) if rate_current else 0

    # Enrich each pool entry with monitor metadata
    enriched_pools = {}
    thresholds = settings.get_pool_thresholds()
    for pool_key, report in pool_report.items():
        last_gen_time = meta.get(f"{pool_key}:last_generation_time")
        total_generated = meta.get(f"{pool_key}:total_generated", "0")
        enriched_pools[pool_key] = {
            **report,
            "threshold": thresholds.get(pool_key, report["min_size"]),
            "last_generation_time": float(last_gen_time) if last_gen_time else None,
            "total_generated": int(total_generated),
        }

    last_run = meta.get("last_run_time")
    return {
        "pools": enriched_pools,
        "monitor": {
            "last_run_time": float(last_run) if last_run else None,
            "schedule_interval_seconds": settings.pool_monitor_interval_seconds,
            "rate_limit_per_minute": settings.pool_generation_rate_limit,
            "current_rate_usage": rate_current,
        },
    }


@router.get("/{pool_type}/{difficulty}")
async def get_content(
    pool_type: str,
    difficulty: str,
    pool: ContentPool = Depends(get_content_pool),
):
    """Get pre-generated content from pool. Falls back to sync generation if empty."""
    pool_key = f"pool:{pool_type}:{difficulty}"
    if pool_key not in ContentPool.POOL_CONFIG:
        raise HTTPException(status_code=404, detail=f"Unknown pool: {pool_key}")

    content = await pool.pop(pool_key)
    if content is None:
        return JSONResponse(
            status_code=204,
            content={"detail": "Pool empty, use sync generation endpoint"},
        )

    return {"content": content, "source": "pool"}
