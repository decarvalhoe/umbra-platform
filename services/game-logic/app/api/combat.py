from fastapi import APIRouter, Request

from app.models.schemas import (
    CombatAction,
    CombatResult,
    DamageCalcRequest,
    DamageCalcResponse,
)

router = APIRouter(prefix="/api/v1/combat", tags=["combat"])


@router.post("/resolve", response_model=CombatResult)
async def resolve_combat(body: CombatAction, request: Request):
    engine = request.app.state.combat_engine
    return engine.resolve_combat(body)


@router.post("/calculate-damage", response_model=DamageCalcResponse)
async def calculate_damage(body: DamageCalcRequest, request: Request):
    engine = request.app.state.combat_engine
    return engine.calculate_damage(body)
