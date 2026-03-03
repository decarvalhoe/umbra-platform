"""Schemas for the Corrupted Guardian boss fight.

Defines server-authoritative boss state, attack declarations,
phase management, damage events, and loot results.
"""

from enum import Enum

from pydantic import BaseModel, Field

from app.models.schemas import Element


class BossPhase(str, Enum):
    """Boss fight phases based on HP thresholds."""
    PHASE_1 = "phase_1"  # 100%-50% HP
    PHASE_2 = "phase_2"  # 50%-0% HP


class BossAttackType(str, Enum):
    """All attack types the Corrupted Guardian can use."""
    GROUND_SLAM = "ground_slam"
    SHADOW_BOLT = "shadow_bolt"
    CORRUPTION_WAVE = "corruption_wave"  # Phase 2 only
    SUMMON_MINIONS = "summon_minions"    # Phase 1 at 75% HP


class BossStateType(str, Enum):
    """Server-side boss AI states."""
    IDLE = "idle"
    TELEGRAPH = "telegraph"
    ATTACK = "attack"
    RECOVERY = "recovery"
    PHASE_TRANSITION = "phase_transition"
    ENRAGED = "enraged"
    DEAD = "dead"


class BossConfig(BaseModel):
    """Static configuration for the Corrupted Guardian."""
    name: str = "Corrupted Guardian"
    max_hp: int = 2500
    attack: int = 45
    defense: int = 22
    speed: float = 70.0
    element: Element = Element.FIRE
    detection_range: float = 800.0  # Arena-wide auto-aggro
    melee_range: float = 120.0
    ranged_range: float = 300.0
    phase_2_threshold: float = 0.5  # 50% HP
    minion_summon_threshold: float = 0.75  # 75% HP
    enrage_timer_seconds: float = 180.0  # 3 minutes
    vulnerability_duration_ms: float = 2000.0  # 2s recovery window
    vulnerability_damage_mult: float = 1.5  # +50% damage during recovery
    xp_reward: int = 500


class BossAttackConfig(BaseModel):
    """Timing and damage configuration for a single boss attack."""
    attack_type: BossAttackType
    telegraph_ms: float
    active_ms: float
    recovery_ms: float
    cooldown_ms: float
    damage: int
    range_px: float
    element: Element | None = None
    aoe_radius: float = 0.0
    notes: str = ""


# Phase 1 attack configs
GROUND_SLAM_P1 = BossAttackConfig(
    attack_type=BossAttackType.GROUND_SLAM,
    telegraph_ms=1500,
    active_ms=500,
    recovery_ms=2000,
    cooldown_ms=3000,
    damage=50,
    range_px=200,
    element=Element.FIRE,
    aoe_radius=200,
    notes="Telegraphed by glowing ground cracks. Dodgeable.",
)

SHADOW_BOLT_P1 = BossAttackConfig(
    attack_type=BossAttackType.SHADOW_BOLT,
    telegraph_ms=1500,
    active_ms=300,
    recovery_ms=2000,
    cooldown_ms=3500,
    damage=30,
    range_px=350,
    element=Element.SHADOW,
    aoe_radius=60,
    notes="Straight-line projectile, medium speed.",
)

SUMMON_MINIONS = BossAttackConfig(
    attack_type=BossAttackType.SUMMON_MINIONS,
    telegraph_ms=1500,
    active_ms=500,
    recovery_ms=2000,
    cooldown_ms=15000,
    damage=0,
    range_px=0,
    notes="Summons 2 shadow minions. One-time at 75% HP.",
)

# Phase 2 attack configs (faster telegraphs)
GROUND_SLAM_P2 = BossAttackConfig(
    attack_type=BossAttackType.GROUND_SLAM,
    telegraph_ms=1000,
    active_ms=400,
    recovery_ms=2000,
    cooldown_ms=2400,
    damage=65,
    range_px=220,
    element=Element.FIRE,
    aoe_radius=220,
    notes="Faster telegraph, larger AoE, more damage.",
)

SHADOW_BOLT_P2 = BossAttackConfig(
    attack_type=BossAttackType.SHADOW_BOLT,
    telegraph_ms=1000,
    active_ms=200,
    recovery_ms=2000,
    cooldown_ms=2800,
    damage=40,
    range_px=350,
    element=Element.SHADOW,
    aoe_radius=60,
    notes="Faster telegraph, more damage.",
)

CORRUPTION_WAVE = BossAttackConfig(
    attack_type=BossAttackType.CORRUPTION_WAVE,
    telegraph_ms=1000,
    active_ms=800,
    recovery_ms=2000,
    cooldown_ms=5000,
    damage=45,
    range_px=400,
    element=Element.VOID,
    aoe_radius=400,
    notes="AoE ring. Must dodge through it.",
)

# Phase attack tables
PHASE_1_ATTACKS = [GROUND_SLAM_P1, SHADOW_BOLT_P1]
PHASE_2_ATTACKS = [GROUND_SLAM_P2, SHADOW_BOLT_P2, CORRUPTION_WAVE]


class BossState(BaseModel):
    """Server-authoritative snapshot of the boss fight state."""
    boss_id: str = "corrupted_guardian"
    current_hp: int
    max_hp: int = 2500
    phase: BossPhase = BossPhase.PHASE_1
    ai_state: BossStateType = BossStateType.IDLE
    current_attack: BossAttackType | None = None
    is_vulnerable: bool = False
    is_enraged: bool = False
    enrage_timer_remaining: float = 180.0
    minions_summoned: bool = False
    minions_alive: int = 0
    phase_transitioned: bool = False
    fight_started: bool = False


class BossStartRequest(BaseModel):
    """Request to initiate the boss fight."""
    player_level: int = Field(ge=1)
    player_stats: dict = Field(
        description="Player combat stats (attack, defense, critical_rate, etc.)"
    )


class BossStartResponse(BaseModel):
    """Response after starting the boss fight."""
    boss_state: BossState
    arena_config: dict = Field(
        default_factory=lambda: {
            "diameter": 800,
            "pillars": 4,
            "pillar_hp": 200,
        }
    )
    message: str = "The Corrupted Guardian awakens!"


class BossDamageRequest(BaseModel):
    """Request to deal damage to the boss."""
    damage: int = Field(gt=0)
    element: Element | None = None
    is_critical: bool = False
    player_position: dict = Field(
        default_factory=lambda: {"x": 0, "y": 0},
        description="Player position for AoE/range checks.",
    )


class BossDamageResponse(BaseModel):
    """Response after dealing damage to the boss."""
    actual_damage: int
    boss_state: BossState
    phase_changed: bool = False
    new_phase: BossPhase | None = None
    vulnerability_bonus: bool = False
    message: str = ""


class BossAttackRequest(BaseModel):
    """Request the boss to select and execute its next attack."""
    player_position: dict = Field(
        description="Current player position {x, y}."
    )
    elapsed_ms: float = Field(
        description="Time since last boss action in ms."
    )


class BossAttackResponse(BaseModel):
    """Response with the boss's chosen attack."""
    attack: BossAttackConfig
    boss_state: BossState
    telegraph_position: dict = Field(
        default_factory=lambda: {"x": 0, "y": 0},
        description="Position where the attack will land.",
    )
    message: str = ""


class BossLootItem(BaseModel):
    """A single item from the boss loot table."""
    id: str
    name: str
    rarity: str = Field(pattern=r"^(common|uncommon|rare|epic|legendary)$")
    drop_rate: float


class BossDefeatResponse(BaseModel):
    """Response when the boss is defeated."""
    xp_reward: int
    loot: list[BossLootItem]
    fight_duration_seconds: float
    total_damage_dealt: int
    message: str = "The Corrupted Guardian has fallen!"
