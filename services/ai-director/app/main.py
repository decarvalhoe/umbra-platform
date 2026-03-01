from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.config import settings
from app.api.generate import router as generate_router
from app.api.director import router as director_router
from app.services.llm_client import get_llm_client
from app.services.content_generator import ContentGenerator


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
