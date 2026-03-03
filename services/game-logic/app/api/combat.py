from fastapi import APIRouter, Request

from app.models.schemas import (
    CombatAction,
    CombatResult,
    DamageCalcRequest,
    DamageCalcResponse,
    StatusTickRequest,
    StatusTickResult,
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


@router.post("/status-tick", response_model=StatusTickResult)
async def process_status_tick(body: StatusTickRequest, request: Request):
    """Process one tick of all active status effects on a target.

    Applies DoT damage (Burn, Bleed) and advances duration-based
    debuff timers (Weaken, Tear).  Returns the tick result including
    total DoT damage, modifier snapshots, and any expired effects.
    """
    engine = request.app.state.combat_engine
    return engine.status_manager.process_tick(body)
