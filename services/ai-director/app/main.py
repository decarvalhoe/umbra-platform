import logging
from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI

from app.config import settings
from app.api.generate import router as generate_router
from app.api.director import router as director_router
from app.api.pool import router as pool_router
from app.services.llm_client import get_llm_client
from app.services.content_generator import ContentGenerator
from app.services.content_pool import ContentPool
from app.worker import celery_app
from app.tasks.generation import ping

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # LLM client + content generator
    llm = get_llm_client(settings.llm_provider, settings.llm_model)
    app.state.content_generator = ContentGenerator(llm)

    # Redis client + content pool
    redis_client = redis.from_url(
        settings.redis_url,
        decode_responses=True,
    )
    app.state.redis = redis_client
    app.state.content_pool = ContentPool(redis_client)
    logger.info("Redis content pool connected: %s", settings.redis_url)

    yield

    # Shutdown: close Redis connection
    await redis_client.aclose()
    logger.info("Redis connection closed")


app = FastAPI(title="Umbra AI Director", version="1.0.0", lifespan=lifespan)
app.include_router(generate_router)
app.include_router(director_router)
app.include_router(pool_router)


@app.get("/health")
async def health():
    health_response = {"status": "ok", "service": "ai-director"}
    try:
        pool: ContentPool = app.state.content_pool
        pool_report = await pool.health_report()
        all_healthy = all(p["healthy"] for p in pool_report.values())
        health_response["pools"] = pool_report
        health_response["pools_healthy"] = all_healthy
    except Exception:
        health_response["pools"] = "unavailable"
        health_response["pools_healthy"] = False
    return health_response


@app.post("/tasks/ping")
async def task_ping():
    """Dispatch a ping task to verify Celery is running."""
    result = ping.delay()
    return {"task_id": result.id, "status": "dispatched"}


@app.get("/tasks/status/{task_id}")
async def task_status(task_id: str):
    """Check the status of a Celery task."""
    result = celery_app.AsyncResult(task_id)
    response = {"task_id": task_id, "status": result.status}
    if result.ready():
        response["result"] = result.result
    return response
