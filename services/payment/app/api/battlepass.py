from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.db_models import BattlePassProgress as BattlePassProgressDB
from app.models.schemas import (
    BattlePassInfo,
    BattlePassProgressSchema,
    ClaimRewardRequest,
    ClaimRewardResponse,
)

router = APIRouter(prefix="/api/v1/battlepass", tags=["battlepass"])

# Season 1 reference date (first season start)
SEASON_EPOCH = datetime(2024, 1, 1, tzinfo=timezone.utc)

# XP required per tier
XP_PER_TIER = 1000

# Tier reward definitions (simplified)
TIER_REWARDS: dict[int, dict] = {
    1: {"type": "currency", "item": "gold", "amount": 100},
    5: {"type": "cosmetic", "item": "shadow_cloak", "amount": 1},
    10: {"type": "rune_card", "item": "fire_rune_basic", "amount": 1},
    25: {"type": "currency", "item": "gems", "amount": 50},
    50: {"type": "cosmetic", "item": "void_armor_set", "amount": 1},
    75: {"type": "rune_card", "item": "blood_rune_epic", "amount": 1},
    100: {"type": "legendary_item", "item": "ancient_blade_of_twilight", "amount": 1},
}


def _get_current_season() -> BattlePassInfo:
    """Calculate the current season based on the epoch and season length."""
    now = datetime.now(timezone.utc)
    weeks = settings.battlepass_season_weeks
    season_duration = timedelta(weeks=weeks)

    elapsed = now - SEASON_EPOCH
    season_number = int(elapsed / season_duration) + 1
    season_start = SEASON_EPOCH + (season_number - 1) * season_duration
    season_end = season_start + season_duration

    return BattlePassInfo(
        season_id=f"season_{season_number}",
        name=f"Season {season_number}: Shadows of the Void",
        start_date=season_start.isoformat(),
        end_date=season_end.isoformat(),
        total_tiers=100,
        weeks=weeks,
        is_active=season_start <= now < season_end,
    )


def _get_available_rewards(tier: int, claimed: list[int]) -> list[dict]:
    """Return list of rewards available to claim at or below the current tier."""
    available = []
    for reward_tier, reward in TIER_REWARDS.items():
        if reward_tier <= tier and reward_tier not in claimed:
            available.append({"tier": reward_tier, **reward})
    return available


@router.get("/current", response_model=BattlePassInfo)
async def get_current_season():
    """Return information about the current battle pass season."""
    return _get_current_season()


@router.get("/{user_id}/progress", response_model=BattlePassProgressSchema)
async def get_progress(user_id: str, db: AsyncSession = Depends(get_db)):
    """Return a player's battle pass progress for the current season."""
    season = _get_current_season()

    result = await db.execute(
        select(BattlePassProgressDB).where(
            BattlePassProgressDB.user_id == user_id,
            BattlePassProgressDB.season_id == season.season_id,
        )
    )
    progress = result.scalar_one_or_none()

    if progress is None:
        # Create new progress entry for this user/season
        progress = BattlePassProgressDB(
            user_id=user_id,
            season_id=season.season_id,
            tier=0,
            xp=0,
            is_premium=False,
            claimed_tiers=[],
        )
        db.add(progress)
        await db.commit()
        await db.refresh(progress)

    claimed = progress.claimed_tiers or []
    rewards = _get_available_rewards(progress.tier, claimed)

    return BattlePassProgressSchema(
        user_id=progress.user_id,
        season_id=progress.season_id,
        tier=progress.tier,
        xp=progress.xp,
        is_premium=progress.is_premium,
        claimed_tiers=claimed,
        rewards_available=rewards,
    )


@router.post("/{user_id}/claim", response_model=ClaimRewardResponse)
async def claim_reward(
    user_id: str,
    body: ClaimRewardRequest,
    db: AsyncSession = Depends(get_db),
):
    """Claim a battle pass reward at the specified tier."""
    season = _get_current_season()

    result = await db.execute(
        select(BattlePassProgressDB).where(
            BattlePassProgressDB.user_id == user_id,
            BattlePassProgressDB.season_id == season.season_id,
        )
    )
    progress = result.scalar_one_or_none()

    if progress is None:
        raise HTTPException(status_code=404, detail="No battle pass progress found")

    if body.tier > progress.tier:
        raise HTTPException(
            status_code=400,
            detail=f"Player is at tier {progress.tier}, cannot claim tier {body.tier}",
        )

    reward = TIER_REWARDS.get(body.tier)
    if reward is None:
        raise HTTPException(
            status_code=400,
            detail=f"No reward available at tier {body.tier}",
        )

    claimed = list(progress.claimed_tiers or [])
    if body.tier in claimed:
        raise HTTPException(
            status_code=400,
            detail=f"Tier {body.tier} reward already claimed",
        )

    claimed.append(body.tier)
    progress.claimed_tiers = claimed
    await db.commit()
    await db.refresh(progress)

    return ClaimRewardResponse(
        success=True,
        reward={"tier": body.tier, **reward},
        new_tier=progress.tier,
    )
