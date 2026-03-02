"""Status effect management for the elemental combat system.

Handles application, ticking, and expiry of the four status effects:
- Burn  (Fire)  : DoT, 5% max HP per tick, 3 ticks
- Weaken (Shadow): -20% defense for 8 seconds
- Bleed (Blood) : DoT, 3% max HP per tick, 5 ticks, stacks up to 3
- Tear  (Void)  : -15% elemental resistance for 10 seconds
"""

import random

from app.models.schemas import (
    ActiveStatusEffects,
    Element,
    StatusEffect,
    StatusEffectType,
    StatusTickRequest,
    StatusTickResult,
    ELEMENT_STATUS_MAP,
)

# Status effect configuration constants
BURN_TICKS = 3
BURN_PCT = 0.05  # 5% max HP per tick

WEAKEN_DURATION = 8.0  # seconds
WEAKEN_DEFENSE_REDUCTION = 0.20  # -20% defense

BLEED_TICKS = 5
BLEED_PCT = 0.03  # 3% max HP per tick
BLEED_MAX_STACKS = 3

TEAR_DURATION = 10.0  # seconds
TEAR_RESISTANCE_REDUCTION = 0.15  # -15% elemental resistance

BASE_APPLICATION_CHANCE = 0.20  # 20% base chance to apply


class StatusEffectManager:
    """Manages application and processing of elemental status effects."""

    def try_apply(
        self,
        element: Element,
        elemental_power: float = 0.0,
        active_effects: ActiveStatusEffects | None = None,
    ) -> StatusEffect | None:
        """Attempt to apply a status effect based on the attacker's element.

        Args:
            element: The attacker's element (determines which status effect).
            elemental_power: Attacker's elemental power stat (0.0-1.0),
                scales application chance above the base 20%.
            active_effects: Current active effects on the target, used to
                check Bleed stack limits.

        Returns:
            A new StatusEffect if application succeeds, or None.
        """
        chance = BASE_APPLICATION_CHANCE + elemental_power
        if random.random() >= chance:
            return None

        effect_type = ELEMENT_STATUS_MAP[element]
        return self._create_effect(effect_type, element, active_effects)

    def force_apply(
        self,
        element: Element,
        active_effects: ActiveStatusEffects | None = None,
    ) -> StatusEffect:
        """Apply a status effect unconditionally (no RNG roll).

        Useful for abilities that guarantee a status application.
        """
        effect_type = ELEMENT_STATUS_MAP[element]
        return self._create_effect(effect_type, element, active_effects)

    def _create_effect(
        self,
        effect_type: StatusEffectType,
        source_element: Element,
        active_effects: ActiveStatusEffects | None,
    ) -> StatusEffect:
        """Build a StatusEffect with the correct parameters."""
        if effect_type == StatusEffectType.BURN:
            return StatusEffect(
                effect_type=StatusEffectType.BURN,
                source_element=source_element,
                remaining_ticks=BURN_TICKS,
            )
        elif effect_type == StatusEffectType.WEAKEN:
            return StatusEffect(
                effect_type=StatusEffectType.WEAKEN,
                source_element=source_element,
                remaining_seconds=WEAKEN_DURATION,
            )
        elif effect_type == StatusEffectType.BLEED:
            # Check for existing Bleed stacks
            current_stacks = 0
            if active_effects:
                for eff in active_effects.effects:
                    if eff.effect_type == StatusEffectType.BLEED:
                        current_stacks = eff.stacks
                        break
            new_stacks = min(current_stacks + 1, BLEED_MAX_STACKS)
            return StatusEffect(
                effect_type=StatusEffectType.BLEED,
                source_element=source_element,
                remaining_ticks=BLEED_TICKS,
                stacks=new_stacks,
            )
        else:  # TEAR
            return StatusEffect(
                effect_type=StatusEffectType.TEAR,
                source_element=source_element,
                remaining_seconds=TEAR_DURATION,
            )

    def add_effect(
        self, active: ActiveStatusEffects, new_effect: StatusEffect
    ) -> ActiveStatusEffects:
        """Add or merge a new status effect into the active set.

        - Bleed stacks merge (refresh ticks, increase stacks).
        - Weaken/Tear refresh their duration if reapplied.
        - Burn refreshes its tick counter if reapplied.
        """
        effects = list(active.effects)
        merged = False

        for i, existing in enumerate(effects):
            if existing.effect_type == new_effect.effect_type:
                if new_effect.effect_type == StatusEffectType.BLEED:
                    # Merge stacks, refresh ticks
                    effects[i] = StatusEffect(
                        effect_type=StatusEffectType.BLEED,
                        source_element=new_effect.source_element,
                        remaining_ticks=BLEED_TICKS,
                        stacks=new_effect.stacks,
                    )
                elif new_effect.effect_type == StatusEffectType.BURN:
                    # Refresh ticks
                    effects[i] = StatusEffect(
                        effect_type=StatusEffectType.BURN,
                        source_element=new_effect.source_element,
                        remaining_ticks=BURN_TICKS,
                    )
                elif new_effect.effect_type == StatusEffectType.WEAKEN:
                    # Refresh duration
                    effects[i] = StatusEffect(
                        effect_type=StatusEffectType.WEAKEN,
                        source_element=new_effect.source_element,
                        remaining_seconds=WEAKEN_DURATION,
                    )
                elif new_effect.effect_type == StatusEffectType.TEAR:
                    # Refresh duration
                    effects[i] = StatusEffect(
                        effect_type=StatusEffectType.TEAR,
                        source_element=new_effect.source_element,
                        remaining_seconds=TEAR_DURATION,
                    )
                merged = True
                break

        if not merged:
            effects.append(new_effect)

        return ActiveStatusEffects(effects=effects, max_hp=active.max_hp)

    def process_tick(self, request: StatusTickRequest) -> StatusTickResult:
        """Process one tick of all active status effects.

        DoT effects deal damage once per tick. Duration-based debuffs
        decrement their remaining time by tick_interval seconds.

        Returns a StatusTickResult with total DoT damage, modifier
        snapshots, remaining effects, and any expired effect types.
        """
        dot_damage = 0
        defense_modifier = 1.0
        resistance_modifier = 1.0
        remaining: list[StatusEffect] = []
        expired: list[StatusEffectType] = []
        max_hp = request.active_effects.max_hp
        tick_interval = request.tick_interval

        for effect in request.active_effects.effects:
            if effect.effect_type == StatusEffectType.BURN:
                # Deal 5% max HP damage
                dot_damage += int(max_hp * BURN_PCT)
                new_ticks = effect.remaining_ticks - 1
                if new_ticks > 0:
                    remaining.append(
                        StatusEffect(
                            effect_type=StatusEffectType.BURN,
                            source_element=effect.source_element,
                            remaining_ticks=new_ticks,
                        )
                    )
                else:
                    expired.append(StatusEffectType.BURN)

            elif effect.effect_type == StatusEffectType.BLEED:
                # Deal 3% max HP per stack
                dot_damage += int(max_hp * BLEED_PCT * effect.stacks)
                new_ticks = effect.remaining_ticks - 1
                if new_ticks > 0:
                    remaining.append(
                        StatusEffect(
                            effect_type=StatusEffectType.BLEED,
                            source_element=effect.source_element,
                            remaining_ticks=new_ticks,
                            stacks=effect.stacks,
                        )
                    )
                else:
                    expired.append(StatusEffectType.BLEED)

            elif effect.effect_type == StatusEffectType.WEAKEN:
                # Apply defense reduction
                defense_modifier *= 1.0 - WEAKEN_DEFENSE_REDUCTION
                new_seconds = effect.remaining_seconds - tick_interval
                if new_seconds > 0:
                    remaining.append(
                        StatusEffect(
                            effect_type=StatusEffectType.WEAKEN,
                            source_element=effect.source_element,
                            remaining_seconds=new_seconds,
                        )
                    )
                else:
                    expired.append(StatusEffectType.WEAKEN)

            elif effect.effect_type == StatusEffectType.TEAR:
                # Apply resistance reduction
                resistance_modifier *= 1.0 - TEAR_RESISTANCE_REDUCTION
                new_seconds = effect.remaining_seconds - tick_interval
                if new_seconds > 0:
                    remaining.append(
                        StatusEffect(
                            effect_type=StatusEffectType.TEAR,
                            source_element=effect.source_element,
                            remaining_seconds=new_seconds,
                        )
                    )
                else:
                    expired.append(StatusEffectType.TEAR)

        return StatusTickResult(
            dot_damage=dot_damage,
            defense_modifier=defense_modifier,
            resistance_modifier=resistance_modifier,
            remaining_effects=remaining,
            expired_effects=expired,
        )

    def get_active_modifiers(
        self, active: ActiveStatusEffects
    ) -> dict[str, float]:
        """Return the current defense and resistance modifiers.

        This is a convenience method for the combat engine to snapshot
        debuff modifiers without processing a full tick.
        """
        defense_modifier = 1.0
        resistance_modifier = 1.0

        for effect in active.effects:
            if effect.effect_type == StatusEffectType.WEAKEN:
                defense_modifier *= 1.0 - WEAKEN_DEFENSE_REDUCTION
            elif effect.effect_type == StatusEffectType.TEAR:
                resistance_modifier *= 1.0 - TEAR_RESISTANCE_REDUCTION

        return {
            "defense_modifier": defense_modifier,
            "resistance_modifier": resistance_modifier,
        }
