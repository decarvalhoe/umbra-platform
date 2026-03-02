import random

from app.models.schemas import (
    ActiveStatusEffects,
    CombatAction,
    CombatResult,
    DamageCalcRequest,
    DamageCalcResponse,
    Element,
    StatusEffect,
)
from app.services.status_effects import StatusEffectManager


class CombatEngine:
    """Core combat resolution engine with elemental advantage system."""

    # Element advantage matrix: (attacker, defender) -> multiplier
    # Fire > Shadow (1.5), Shadow > Blood (1.5), Blood > Void (1.5), Void > Fire (1.5)
    # Reverse matchups = 0.75, same element = 1.0
    ELEMENT_MATRIX: dict[tuple[Element, Element], float] = {
        (Element.FIRE, Element.SHADOW): 1.5,
        (Element.SHADOW, Element.BLOOD): 1.5,
        (Element.BLOOD, Element.VOID): 1.5,
        (Element.VOID, Element.FIRE): 1.5,
        (Element.SHADOW, Element.FIRE): 0.75,
        (Element.BLOOD, Element.SHADOW): 0.75,
        (Element.VOID, Element.BLOOD): 0.75,
        (Element.FIRE, Element.VOID): 0.75,
        (Element.FIRE, Element.FIRE): 1.0,
        (Element.SHADOW, Element.SHADOW): 1.0,
        (Element.BLOOD, Element.BLOOD): 1.0,
        (Element.VOID, Element.VOID): 1.0,
    }

    DUAL_WIELD_BONUS_PER_HAND = 0.15  # 15% per hand

    ACTION_MULTIPLIERS: dict[str, float] = {
        "attack": 1.0,
        "skill": 1.5,
        "ultimate": 2.5,
    }

    def __init__(self) -> None:
        self.status_manager = StatusEffectManager()

    def _get_element_multiplier(
        self, attacker: Element | None, defender: Element | None
    ) -> float:
        """Look up the elemental advantage multiplier."""
        if attacker is None or defender is None:
            return 1.0
        return self.ELEMENT_MATRIX.get((attacker, defender), 1.0)

    def _is_critical(self, critical_rate: float) -> bool:
        """Roll for a critical hit based on the given rate (0.0 - 1.0)."""
        return random.random() < critical_rate

    def resolve_combat(self, action: CombatAction) -> CombatResult:
        """Resolve a single combat action and return the result.

        When the attacker has an element, a status effect application is
        attempted using the base 20% chance scaled by the attacker's
        ``elemental_power`` stat.  If the defender has active status effects
        (passed via ``defender_stats["active_effects"]``), Weaken and Tear
        modifiers are applied to defense and elemental multiplier
        respectively.
        """
        base_atk = int(action.attacker_stats.get("attack", 10))
        base_def = int(action.defender_stats.get("defense", 5))
        crit_rate = float(action.attacker_stats.get("critical_rate", 0.1))

        # Parse defender's active status effects (if provided)
        defender_active: ActiveStatusEffects | None = None
        if "active_effects" in action.defender_stats:
            defender_active = ActiveStatusEffects(
                **action.defender_stats["active_effects"]
            )

        # Apply debuff modifiers from active status effects
        defense_modifier = 1.0
        resistance_modifier = 1.0
        if defender_active:
            mods = self.status_manager.get_active_modifiers(defender_active)
            defense_modifier = mods["defense_modifier"]
            resistance_modifier = mods["resistance_modifier"]

        # Apply Weaken defense reduction
        effective_def = int(base_def * defense_modifier)

        # Base damage = attacker's attack minus effective defense (minimum 1)
        raw_damage = max(1, base_atk - effective_def)

        # Action type multiplier
        action_mult = self.ACTION_MULTIPLIERS.get(action.action_type, 1.0)

        # Element multiplier
        element_mult = self._get_element_multiplier(
            action.element,
            Element(action.defender_stats["element"])
            if "element" in action.defender_stats
            else None,
        )

        # Apply Tear resistance reduction (amplifies elemental damage)
        if element_mult != 1.0 and resistance_modifier < 1.0:
            # Tear makes elemental advantages stronger and disadvantages worse
            bonus = element_mult - 1.0
            element_mult = 1.0 + bonus / resistance_modifier

        # Dual wield bonus
        dw_mult = 1.0
        if action.is_dual_wield:
            dw_mult = 1.0 + (self.DUAL_WIELD_BONUS_PER_HAND * 2)

        # Critical hit
        is_crit = self._is_critical(crit_rate)
        crit_mult = 2.0 if is_crit else 1.0

        # Combo multiplier
        combo_mult = action.combo_multiplier
        combo_triggered = combo_mult > 1.0

        # Final damage calculation
        final_damage = int(
            raw_damage * action_mult * element_mult * dw_mult * crit_mult * combo_mult
        )

        # Build effects list
        effects: list[str] = []
        if is_crit:
            effects.append("critical_hit")
        if element_mult > 1.0:
            effects.append("elemental_advantage")
        elif element_mult < 1.0:
            effects.append("elemental_disadvantage")
        if action.is_dual_wield:
            effects.append("dual_wield")
        if combo_triggered:
            effects.append("combo")
        if defense_modifier < 1.0:
            effects.append("weakened")
        if resistance_modifier < 1.0:
            effects.append("torn")

        # Attempt status effect application
        applied_status: StatusEffect | None = None
        if action.element is not None:
            elemental_power = float(
                action.attacker_stats.get("elemental_power", 0.0)
            )
            applied_status = self.status_manager.try_apply(
                element=action.element,
                elemental_power=elemental_power,
                active_effects=defender_active,
            )
            if applied_status is not None:
                effects.append(f"applied_{applied_status.effect_type.value}")

        return CombatResult(
            damage=final_damage,
            element_bonus=element_mult - 1.0,
            is_critical=is_crit,
            combo_triggered=combo_triggered,
            effects=effects,
            applied_status=applied_status,
        )

    def calculate_damage(self, request: DamageCalcRequest) -> DamageCalcResponse:
        """Pure damage calculation without full combat context."""
        element_mult = self._get_element_multiplier(
            request.attacker_element, request.defender_element
        )
        is_crit = self._is_critical(request.critical_rate)
        crit_mult = 2.0 if is_crit else 1.0
        dw_mult = 1.0 + request.dual_wield_bonus

        final_damage = int(
            request.base_damage * element_mult * crit_mult * dw_mult
        )

        breakdown = {
            "base_damage": request.base_damage,
            "element_multiplier": element_mult,
            "critical_multiplier": crit_mult,
            "dual_wield_multiplier": dw_mult,
        }

        return DamageCalcResponse(
            final_damage=final_damage,
            element_multiplier=element_mult,
            is_critical=is_crit,
            breakdown=breakdown,
        )
