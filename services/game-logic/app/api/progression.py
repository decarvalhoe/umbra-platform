from fastapi import APIRouter, Request

from app.models.schemas import (
    XPCalcRequest,
    XPCalcResponse,
    LevelUpRequest,
    LevelUpResponse,
    TalentAllocationRequest,
    TalentAllocationResponse,
)

router = APIRouter(prefix="/api/v1/progression", tags=["progression"])


@router.post("/calculate-xp", response_model=XPCalcResponse)
async def calculate_xp(body: XPCalcRequest, request: Request):
    progression = request.app.state.progression_service
    return progression.calculate_xp(body)


@router.post("/level-up", response_model=LevelUpResponse)
async def level_up(body: LevelUpRequest, request: Request):
    progression = request.app.state.progression_service
    return progression.level_up(body)


@router.post("/talent-tree", response_model=TalentAllocationResponse)
async def allocate_talent(body: TalentAllocationRequest, request: Request):
    progression = request.app.state.progression_service
    return progression.allocate_talent(body)
