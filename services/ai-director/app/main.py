from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.config import settings
from app.api.generate import router as generate_router
from app.api.director import router as director_router
from app.services.llm_client import get_llm_client
from app.services.content_generator import ContentGenerator
from app.services.content_pool import ContentPool
from app.worker import celery_app
from app.tasks.generation import (
    ping,
    generate_quest_task,
    generate_dungeon_task,
    generate_narrative_task,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    llm = get_llm_client(settings.llm_provider, settings.llm_model)
    app.state.content_generator = ContentGenerator(llm)

    pool = ContentPool()
    await pool.connect()
    app.state.content_pool = pool

    yield

    await app.state.content_pool.disconnect()


app = FastAPI(title="Umbra AI Director", version="1.0.0", lifespan=lifespan)
app.include_router(generate_router)
app.include_router(director_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-director"}


@app.get("/pool/status")
async def pool_status():
    status = await app.state.content_pool.pool_status()
    return {"status": "ok", "pools": status}


@app.post("/pool/generate/{content_type}")
async def pool_generate_and_store(content_type: str, difficulty: str = "normal"):
    task_map = {
        "quest": generate_quest_task,
        "dungeon": generate_dungeon_task,
        "narrative": generate_narrative_task,
    }
    task_fn = task_map.get(content_type)
    if not task_fn:
        raise HTTPException(
            status_code=400, detail=f"Unknown content type: {content_type}"
        )

    if content_type == "quest":
        result = task_fn.delay(player_level=10, difficulty=difficulty)
    elif content_type == "dungeon":
        result = task_fn.delay(floor_level=5, corruption=0.3, player_level=10)
    else:
        result = task_fn.delay(
            event_type="encounter", current_zone="ashen_wastes"
        )

    return {
        "task_id": result.id,
        "content_type": content_type,
        "status": "dispatched",
    }


@app.post("/tasks/ping")
async def task_ping():
    result = ping.delay()
    return {"task_id": result.id, "status": "dispatched"}


@app.get("/tasks/status/{task_id}")
async def task_status(task_id: str):
    result = celery_app.AsyncResult(task_id)
    response = {"task_id": task_id, "status": result.status}
    if result.ready():
        response["result"] = result.result
    return response
