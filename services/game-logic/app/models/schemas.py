from enum import Enum

from pydantic import BaseModel, Field


class Element(str, Enum):
    FIRE = "fire"
    SHADOW = "shadow"
    BLOOD = "blood"
    VOID = "void"


class StatusEffectType(str, Enum):
    BURN = "burn"        # Fire DoT: 5% max HP per tick, 3 ticks
    WEAKEN = "weaken"    # Shadow debuff: -20% defense, 8 seconds
    BLEED = "bleed"      # Blood DoT: 3% max HP per tick, 5 ticks, stacks x3
    TEAR = "tear"        # Void debuff: -15% elemental resistance, 10 seconds


# Maps each element to the status effect it can inflict
ELEMENT_STATUS_MAP: dict[Element, StatusEffectType] = {
    Element.FIRE: StatusEffectType.BURN,
    Element.SHADOW: StatusEffectType.WEAKEN,
    Element.BLOOD: StatusEffectType.BLEED,
    Element.VOID: StatusEffectType.TEAR,
}


class StatusEffect(BaseModel):
    """A single active status effect on a combatant."""
    effect_type: StatusEffectType
    source_element: Element
    remaining_ticks: int = 0       # For DoT effects (Burn, Bleed)
    remaining_seconds: float = 0.0  # For duration-based debuffs (Weaken, Tear)
    stacks: int = 1                # Only Bleed stacks (max 3)


class ActiveStatusEffects(BaseModel):
    """All active status effects on a single target."""
    effects: list[StatusEffect] = Field(default_factory=list)
    max_hp: int = Field(description="Target's maximum HP for DoT calculations")


# ---------------------------------------------------------------------------
# Combat
# ---------------------------------------------------------------------------

class CombatAction(BaseModel):
    attacker_stats: dict
    defender_stats: dict
    action_type: str = Field(pattern=r"^(attack|skill|ultimate)$")
    element: Element | None = None
    combo_multiplier: float = 1.0
    is_dual_wield: bool = False


class CombatResult(BaseModel):
    damage: int
    element_bonus: float
    is_critical: bool
    combo_triggered: bool
    effects: list[str]
    applied_status: StatusEffect | None = None


class DamageCalcRequest(BaseModel):
    base_damage: int
    attacker_element: Element | None = None
    defender_element: Element | None = None
    critical_rate: float
    dual_wield_bonus: float = 0.0


class DamageCalcResponse(BaseModel):
    final_damage: int
    element_multiplier: float
    is_critical: bool
    breakdown: dict


# ---------------------------------------------------------------------------
# Status Effect Processing
# ---------------------------------------------------------------------------

class StatusTickRequest(BaseModel):
    """Request to process one tick of status effects on a target."""
    active_effects: ActiveStatusEffects
    tick_interval: float = Field(
        default=2.0, description="Seconds per tick (default 2s)"
    )


class StatusTickResult(BaseModel):
    """Result of processing one tick of status effects."""
    dot_damage: int = 0
    defense_modifier: float = Field(
        default=1.0, description="Multiplier on defense (e.g. 0.8 for Weaken)"
    )
    resistance_modifier: float = Field(
        default=1.0,
        description="Multiplier on elemental resistance (e.g. 0.85 for Tear)",
    )
    remaining_effects: list[StatusEffect] = Field(default_factory=list)
    expired_effects: list[StatusEffectType] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Gacha
# ---------------------------------------------------------------------------

class GachaItem(BaseModel):
    id: str
    name: str
    rarity: str = Field(pattern=r"^(common|rare|epic|legendary)$")
    weight: float
    element: str | None = None


class GachaPool(BaseModel):
    id: str
    name: str
    items: list[GachaItem]
    pity_threshold: int = 90


class GachaDrawRequest(BaseModel):
    pool_id: str
    num_draws: int = 1
    pity_counter: int = 0


class GachaDrawResponse(BaseModel):
    items: list[GachaItem]
    new_pity_counter: int
    guaranteed_legendary: bool


# ---------------------------------------------------------------------------
# Progression
# ---------------------------------------------------------------------------

class XPCalcRequest(BaseModel):
    enemies_defeated: int
    floor_level: int
    combo_count: int
    time_bonus: float
    corruption_bonus: float


class XPCalcResponse(BaseModel):
    xp_earned: int
    breakdown: dict


class LevelUpRequest(BaseModel):
    current_level: int
    current_xp: int
    xp_to_add: int


class LevelUpResponse(BaseModel):
    new_level: int
    new_xp: int
    levels_gained: int
    stat_increases: dict


class TalentAllocationRequest(BaseModel):
    tree: str = Field(pattern=r"^(offense|defense|control)$")
    talent_id: str
    current_allocations: dict
    available_points: int


class TalentAllocationResponse(BaseModel):
    success: bool
    remaining_points: int
    new_allocations: dict


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------

class AnomalyEvalRequest(BaseModel):
    session_stats: dict = Field(
        description=(
            "Expected keys: apm, kd_ratio, accuracy, headshot_ratio, "
            "dps, session_duration, resource_rate"
        )
    )


class AnomalyEvalResponse(BaseModel):
    is_suspicious: bool
    score: float
    checks: list[dict]
