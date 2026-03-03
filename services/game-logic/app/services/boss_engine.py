"""Server-side boss fight engine for the Corrupted Guardian.

Manages phase transitions, attack selection, damage calculations,
vulnerability windows, enrage timer, and loot generation.
"""

import random
import time

from app.models.boss_schemas import (
    BossAttackConfig,
    BossAttackRequest,
    BossAttackResponse,
    BossAttackType,
    BossConfig,
    BossDamageRequest,
    BossDamageResponse,
    BossDefeatResponse,
    BossLootItem,
    BossPhase,
    BossStartRequest,
    BossStartResponse,
    BossState,
    BossStateType,
    PHASE_1_ATTACKS,
    PHASE_2_ATTACKS,
    SUMMON_MINIONS,
)
from app.models.schemas import Element


# Loot table for the Corrupted Guardian
BOSS_LOOT_TABLE: list[BossLootItem] = [
    BossLootItem(
        id="guardians_molten_core",
        name="Guardian's Molten Core",
        rarity="legendary",
        drop_rate=1.0,  # Guaranteed
    ),
    BossLootItem(
        id="corrupted_void_shard",
        name="Corrupted Void Shard",
        rarity="uncommon",
        drop_rate=0.4,
    ),
    BossLootItem(
        id="infernal_guardian_greaves",
        name="Infernal Guardian Greaves",
        rarity="rare",
        drop_rate=0.15,
    ),
    BossLootItem(
        id="flame_of_the_fallen",
        name="Flame of the Fallen",
        rarity="rare",
        drop_rate=0.12,
    ),
    BossLootItem(
        id="void_touched_aegis",
        name="Void-Touched Aegis",
        rarity="epic",
        drop_rate=0.05,
    ),
    BossLootItem(
        id="guardians_ember_crown",
        name="Guardian's Ember Crown",
        rarity="epic",
        drop_rate=0.03,
    ),
]


class BossEngine:
    """Server-side engine for the Corrupted Guardian boss fight.

    This engine is authoritative for:
    - Phase management (HP thresholds trigger phase transitions)
    - Attack selection (weighted random from phase attack table)
    - Damage calculation (defense, vulnerability bonus, element resist)
    - Enrage timer (3 minutes, then instant kill)
    - Loot generation (guaranteed legendary + RNG rolls)
    """

    def __init__(self) -> None:
        self.config = BossConfig()
        self._state: BossState | None = None
        self._fight_start_time: float = 0.0
        self._total_damage_dealt: int = 0
        self._last_attack_time: float = 0.0
        self._attack_cooldowns: dict[BossAttackType, float] = {}

    @property
    def state(self) -> BossState | None:
        return self._state

    def start_fight(self, request: BossStartRequest) -> BossStartResponse:
        """Initialize a new boss fight session."""
        self._state = BossState(
            current_hp=self.config.max_hp,
            max_hp=self.config.max_hp,
            fight_started=True,
        )
        self._fight_start_time = time.monotonic()
        self._total_damage_dealt = 0
        self._attack_cooldowns.clear()

        return BossStartResponse(boss_state=self._state)

    def apply_damage(self, request: BossDamageRequest) -> BossDamageResponse:
        """Apply player damage to the boss, handling phase transitions."""
        if self._state is None:
            raise ValueError("Boss fight has not been started")

        if self._state.ai_state == BossStateType.DEAD:
            raise ValueError("Boss is already dead")

        # Calculate actual damage
        actual_damage = self._calculate_incoming_damage(
            request.damage, request.element
        )

        # Vulnerability bonus during recovery window
        vulnerability_bonus = False
        if self._state.is_vulnerable:
            actual_damage = int(
                actual_damage * self.config.vulnerability_damage_mult
            )
            vulnerability_bonus = True

        # Apply damage
        self._state.current_hp = max(0, self._state.current_hp - actual_damage)
        self._total_damage_dealt += actual_damage

        # Check phase transition
        phase_changed = False
        new_phase = None
        hp_ratio = self._state.current_hp / self._state.max_hp

        if (
            self._state.phase == BossPhase.PHASE_1
            and hp_ratio <= self.config.phase_2_threshold
            and not self._state.phase_transitioned
        ):
            self._state.phase = BossPhase.PHASE_2
            self._state.phase_transitioned = True
            self._state.ai_state = BossStateType.PHASE_TRANSITION
            self._state.is_enraged = True
            phase_changed = True
            new_phase = BossPhase.PHASE_2
            # Reset cooldowns for phase 2
            self._attack_cooldowns.clear()

        # Check death
        message = ""
        if self._state.current_hp <= 0:
            self._state.ai_state = BossStateType.DEAD
            message = "The Corrupted Guardian staggers and falls!"
        elif phase_changed:
            message = (
                "The Guardian roars! Corruption surges through its body. "
                "Rage mode activated!"
            )
        elif vulnerability_bonus:
            message = "Vulnerability exploited! +50% damage!"

        return BossDamageResponse(
            actual_damage=actual_damage,
            boss_state=self._state,
            phase_changed=phase_changed,
            new_phase=new_phase,
            vulnerability_bonus=vulnerability_bonus,
            message=message,
        )

    def select_attack(
        self, request: BossAttackRequest
    ) -> BossAttackResponse:
        """Select the boss's next attack based on phase and cooldowns."""
        if self._state is None:
            raise ValueError("Boss fight has not been started")

        if self._state.ai_state == BossStateType.DEAD:
            raise ValueError("Boss is already dead")

        # Update enrage timer
        elapsed_total = time.monotonic() - self._fight_start_time
        self._state.enrage_timer_remaining = max(
            0.0, self.config.enrage_timer_seconds - elapsed_total
        )

        # Check enrage
        if self._state.enrage_timer_remaining <= 0:
            self._state.is_enraged = True
            self._state.ai_state = BossStateType.ENRAGED

        # Check for minion summon at 75% HP (one-time)
        hp_ratio = self._state.current_hp / self._state.max_hp
        if (
            not self._state.minions_summoned
            and hp_ratio <= self.config.minion_summon_threshold
            and self._state.phase == BossPhase.PHASE_1
        ):
            self._state.minions_summoned = True
            self._state.minions_alive = 2
            self._state.ai_state = BossStateType.TELEGRAPH
            self._state.current_attack = BossAttackType.SUMMON_MINIONS
            return BossAttackResponse(
                attack=SUMMON_MINIONS,
                boss_state=self._state,
                telegraph_position=request.player_position,
                message="The Guardian raises its arms! Shadow portals appear!",
            )

        # Select from phase attack table
        attacks = self._get_available_attacks(request.elapsed_ms)
        if not attacks:
            # All on cooldown -- idle
            self._state.ai_state = BossStateType.IDLE
            self._state.current_attack = None
            return BossAttackResponse(
                attack=self._get_phase_attacks()[0],  # Fallback
                boss_state=self._state,
                telegraph_position=request.player_position,
                message="The Guardian watches...",
            )

        # Weighted random selection
        chosen = random.choice(attacks)

        # Update state
        self._state.ai_state = BossStateType.TELEGRAPH
        self._state.current_attack = chosen.attack_type

        # Set cooldown
        self._attack_cooldowns[chosen.attack_type] = (
            time.monotonic() + chosen.cooldown_ms / 1000.0
        )

        # Calculate telegraph position (target player position)
        telegraph_pos = dict(request.player_position)

        message = self._get_telegraph_message(chosen.attack_type)

        return BossAttackResponse(
            attack=chosen,
            boss_state=self._state,
            telegraph_position=telegraph_pos,
            message=message,
        )

    def set_recovery(self) -> None:
        """Transition the boss to recovery state (vulnerability window)."""
        if self._state is not None:
            self._state.ai_state = BossStateType.RECOVERY
            self._state.is_vulnerable = True
            self._state.current_attack = None

    def end_recovery(self) -> None:
        """End the recovery/vulnerability window."""
        if self._state is not None:
            self._state.is_vulnerable = False
            self._state.ai_state = BossStateType.IDLE

    def generate_loot(self) -> BossDefeatResponse:
        """Generate loot drops on boss defeat."""
        fight_duration = time.monotonic() - self._fight_start_time

        # Roll loot
        drops: list[BossLootItem] = []
        for item in BOSS_LOOT_TABLE:
            if item.drop_rate >= 1.0 or random.random() < item.drop_rate:
                drops.append(item)

        return BossDefeatResponse(
            xp_reward=self.config.xp_reward,
            loot=drops,
            fight_duration_seconds=round(fight_duration, 1),
            total_damage_dealt=self._total_damage_dealt,
        )

    def _calculate_incoming_damage(
        self, raw_damage: int, element: Element | None
    ) -> int:
        """Apply boss defense and elemental resistance to incoming damage."""
        # Apply defense
        damage_after_def = max(1, raw_damage - self.config.defense)

        # Elemental resistance (simplified from GDD for 2-phase version)
        if element == Element.FIRE:
            # Boss is immune to fire
            return 0
        elif element == Element.SHADOW:
            # Boss is resistant to shadow
            damage_after_def = int(damage_after_def * 0.8)
        elif element == Element.VOID:
            if self._state and self._state.phase == BossPhase.PHASE_2:
                # Immune to void in phase 2
                return 0
            else:
                damage_after_def = int(damage_after_def * 0.5)

        return max(1, damage_after_def)

    def _get_phase_attacks(self) -> list[BossAttackConfig]:
        """Return the attack table for the current phase."""
        if self._state and self._state.phase == BossPhase.PHASE_2:
            return PHASE_2_ATTACKS
        return PHASE_1_ATTACKS

    def _get_available_attacks(
        self, elapsed_ms: float
    ) -> list[BossAttackConfig]:
        """Return attacks that are off cooldown."""
        now = time.monotonic()
        attacks = self._get_phase_attacks()
        available = []
        for atk in attacks:
            cd = self._attack_cooldowns.get(atk.attack_type, 0.0)
            if now >= cd:
                available.append(atk)
        return available

    def _get_telegraph_message(self, attack_type: BossAttackType) -> str:
        """Return a descriptive message for the attack telegraph."""
        messages = {
            BossAttackType.GROUND_SLAM: (
                "The Guardian raises its fists! Ground cracks glow beneath you!"
            ),
            BossAttackType.SHADOW_BOLT: (
                "Dark energy gathers in the Guardian's hand!"
            ),
            BossAttackType.CORRUPTION_WAVE: (
                "The Guardian channels corruption! A wave of darkness expands!"
            ),
            BossAttackType.SUMMON_MINIONS: (
                "Shadow portals tear open!"
            ),
        }
        return messages.get(attack_type, "The Guardian prepares to attack!")
