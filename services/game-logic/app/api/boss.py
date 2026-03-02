"""Boss fight API endpoints.

Provides REST endpoints for the Corrupted Guardian boss encounter:
- Start a boss fight
- Deal damage to the boss
- Request the boss's next attack
- Notify recovery state transitions
- Collect loot on defeat
"""

from fastapi import APIRouter, HTTPException, Request

from app.models.boss_schemas import (
    BossAttackRequest,
    BossAttackResponse,
    BossDamageRequest,
    BossDamageResponse,
    BossDefeatResponse,
    BossStartRequest,
    BossStartResponse,
    BossStateType,
)

router = APIRouter(prefix="/api/v1/boss", tags=["boss"])


@router.post("/start", response_model=BossStartResponse)
async def start_boss_fight(body: BossStartRequest, request: Request):
    """Initialize a new Corrupted Guardian boss fight."""
    engine = request.app.state.boss_engine
    return engine.start_fight(body)


@router.post("/damage", response_model=BossDamageResponse)
async def deal_damage(body: BossDamageRequest, request: Request):
    """Apply player damage to the boss."""
    engine = request.app.state.boss_engine
    try:
        return engine.apply_damage(body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/next-attack", response_model=BossAttackResponse)
async def get_next_attack(body: BossAttackRequest, request: Request):
    """Request the boss to select and telegraph its next attack."""
    engine = request.app.state.boss_engine
    try:
        return engine.select_attack(body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/recovery")
async def notify_recovery(request: Request):
    """Notify the server that the boss has entered its recovery window."""
    engine = request.app.state.boss_engine
    engine.set_recovery()
    state = engine.state
    if state is None:
        raise HTTPException(status_code=400, detail="Boss fight not started")
    return {"boss_state": state, "message": "Boss is vulnerable!"}


@router.post("/end-recovery")
async def end_recovery(request: Request):
    """Notify the server that the boss recovery window has ended."""
    engine = request.app.state.boss_engine
    engine.end_recovery()
    state = engine.state
    if state is None:
        raise HTTPException(status_code=400, detail="Boss fight not started")
    return {"boss_state": state, "message": "Boss recovers its guard."}


@router.get("/loot", response_model=BossDefeatResponse)
async def get_loot(request: Request):
    """Generate and return loot after the boss is defeated."""
    engine = request.app.state.boss_engine
    state = engine.state
    if state is None or state.ai_state != BossStateType.DEAD:
        raise HTTPException(
            status_code=400,
            detail="Boss must be defeated before collecting loot",
        )
    return engine.generate_loot()


@router.get("/state")
async def get_boss_state(request: Request):
    """Get the current boss fight state."""
    engine = request.app.state.boss_engine
    state = engine.state
    if state is None:
        raise HTTPException(
            status_code=400, detail="No active boss fight"
        )
    return {"boss_state": state}
