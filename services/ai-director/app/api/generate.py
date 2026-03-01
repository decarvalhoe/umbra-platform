from fastapi import APIRouter, Request

from app.models.schemas import (
    QuestGenerateRequest,
    QuestGenerateResponse,
    DungeonGenerateRequest,
    DungeonGenerateResponse,
    NarrativeEventRequest,
    NarrativeEventResponse,
)

router = APIRouter(prefix="/api/v1/generate", tags=["generate"])


def _get_generator(request: Request):
    return request.app.state.content_generator


@router.post("/quest", response_model=QuestGenerateResponse)
async def generate_quest(body: QuestGenerateRequest, request: Request):
    generator = _get_generator(request)
    return await generator.generate_quest(body)


@router.post("/dungeon", response_model=DungeonGenerateResponse)
async def generate_dungeon(body: DungeonGenerateRequest, request: Request):
    generator = _get_generator(request)
    return await generator.generate_dungeon(body)


@router.post("/narrative-event", response_model=NarrativeEventResponse)
async def generate_narrative_event(body: NarrativeEventRequest, request: Request):
    generator = _get_generator(request)
    return await generator.generate_narrative_event(body)
