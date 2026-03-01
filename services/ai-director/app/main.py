from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.config import settings
from app.api.generate import router as generate_router
from app.api.director import router as director_router
from app.services.llm_client import get_llm_client
from app.services.content_generator import ContentGenerator
from app.worker import celery_app
from app.tasks.generation import ping


@asynccontextmanager
async def lifespan(app: FastAPI):
    llm = get_llm_client(settings.llm_provider, settings.llm_model)
    app.state.content_generator = ContentGenerator(llm)
    yield


app = FastAPI(title="Umbra AI Director", version="1.0.0", lifespan=lifespan)
app.include_router(generate_router)
app.include_router(director_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-director"}


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
