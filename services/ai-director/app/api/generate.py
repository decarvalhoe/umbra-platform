import logging

from fastapi import APIRouter, Request

from app.models.schemas import (
    QuestGenerateRequest,
    QuestGenerateResponse,
    DungeonGenerateRequest,
    DungeonGenerateResponse,
    NarrativeEventRequest,
    NarrativeEventResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/generate", tags=["generate"])


def _get_generator(request: Request):
    return request.app.state.content_generator


def _get_pool(request: Request):
    return request.app.state.content_pool


@router.post("/quest", response_model=QuestGenerateResponse)
async def generate_quest(body: QuestGenerateRequest, request: Request):
    pool = _get_pool(request)
    cached = await pool.get("quest", body.difficulty)
    if cached:
        logger.info("Serving quest from pool (difficulty=%s)", body.difficulty)
        return QuestGenerateResponse(**cached)

    generator = _get_generator(request)
    return await generator.generate_quest(body)


@router.post("/dungeon", response_model=DungeonGenerateResponse)
async def generate_dungeon(body: DungeonGenerateRequest, request: Request):
    pool = _get_pool(request)
    cached = await pool.get("dungeon")
    if cached:
        logger.info("Serving dungeon from pool")
        return DungeonGenerateResponse(**cached)

    generator = _get_generator(request)
    return await generator.generate_dungeon(body)


@router.post("/narrative-event", response_model=NarrativeEventResponse)
async def generate_narrative_event(
    body: NarrativeEventRequest, request: Request
):
    pool = _get_pool(request)
    cached = await pool.get("narrative")
    if cached:
        logger.info("Serving narrative event from pool")
        return NarrativeEventResponse(**cached)

    generator = _get_generator(request)
    return await generator.generate_narrative_event(body)
