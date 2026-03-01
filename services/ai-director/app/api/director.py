from fastapi import APIRouter, Request

from app.models.schemas import (
    DirectorEvaluateRequest,
    DirectorEvaluateResponse,
    ContentRecommendRequest,
    ContentRecommendResponse,
)

router = APIRouter(prefix="/api/v1/director", tags=["director"])


def _get_generator(request: Request):
    return request.app.state.content_generator


@router.post("/evaluate", response_model=DirectorEvaluateResponse)
async def evaluate_session(body: DirectorEvaluateRequest, request: Request):
    generator = _get_generator(request)
    return await generator.evaluate_session(body)


@router.post("/recommend-content", response_model=ContentRecommendResponse)
async def recommend_content(body: ContentRecommendRequest, request: Request):
    generator = _get_generator(request)
    return await generator.recommend_content(body)
