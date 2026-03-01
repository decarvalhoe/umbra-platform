import json
import uuid
import logging
from app.worker import celery_app
from app.services.llm_client import get_llm_client
from app.services.content_generator import ContentGenerator
from app.config import settings
from app.models.schemas import (
    QuestGenerateRequest,
    DungeonGenerateRequest,
    NarrativeEventRequest,
)

logger = logging.getLogger(__name__)


def _get_generator() -> ContentGenerator:
    """Create a fresh ContentGenerator instance for the worker."""
    llm = get_llm_client(settings.llm_provider, settings.llm_model)
    return ContentGenerator(llm)


@celery_app.task(name="generate_quest", bind=True, max_retries=2)
def generate_quest_task(self, player_level: int, difficulty: str = "normal"):
    """Generate a quest and return it as JSON."""
    import asyncio

    async def _generate():
        generator = _get_generator()
        request = QuestGenerateRequest(
            player_level=player_level,
            player_class="shadow_warrior",
            current_zone="ashen_wastes",
            difficulty=difficulty,
        )
        result = await generator.generate_quest(request)
        return result.model_dump()

    try:
        return asyncio.run(_generate())
    except Exception as exc:
        logger.error("Quest generation failed: %s", exc)
        raise self.retry(exc=exc, countdown=5)


@celery_app.task(name="generate_dungeon", bind=True, max_retries=2)
def generate_dungeon_task(self, floor_level: int, corruption: float, player_level: int):
    """Generate a dungeon layout and return it as JSON."""
    import asyncio

    async def _generate():
        generator = _get_generator()
        request = DungeonGenerateRequest(
            floor_level=floor_level,
            corruption=corruption,
            player_level=player_level,
        )
        result = await generator.generate_dungeon(request)
        return result.model_dump()

    try:
        return asyncio.run(_generate())
    except Exception as exc:
        logger.error("Dungeon generation failed: %s", exc)
        raise self.retry(exc=exc, countdown=5)


@celery_app.task(name="generate_narrative", bind=True, max_retries=2)
def generate_narrative_task(self, event_type: str, current_zone: str):
    """Generate a narrative event and return it as JSON."""
    import asyncio

    async def _generate():
        generator = _get_generator()
        request = NarrativeEventRequest(
            event_type=event_type,
            player_context={},
            current_zone=current_zone,
        )
        result = await generator.generate_narrative_event(request)
        return result.model_dump()

    try:
        return asyncio.run(_generate())
    except Exception as exc:
        logger.error("Narrative generation failed: %s", exc)
        raise self.retry(exc=exc, countdown=5)


@celery_app.task(name="ping")
def ping():
    """Simple health check task."""
    return "pong"
