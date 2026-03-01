from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.dependencies import get_content_pool
from app.services.content_pool import ContentPool

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
