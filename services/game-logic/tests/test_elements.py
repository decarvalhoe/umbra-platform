"""Tests for the elemental system and status effects.

Covers:
- StatusEffectManager: application, stacking, merging, tick processing
- CombatEngine integration: debuff modifiers, status application on hit
- API endpoint: /api/v1/combat/status-tick
"""

from unittest.mock import patch

import pytest

from app.models.schemas import (
    ActiveStatusEffects,
    Element,
    StatusEffect,
    StatusEffectType,
    StatusTickRequest,
    ELEMENT_STATUS_MAP,
)
from app.services.status_effects import (
    BASE_APPLICATION_CHANCE,
    BLEED_MAX_STACKS,
    BLEED_PCT,
    BLEED_TICKS,
    BURN_PCT,
    BURN_TICKS,
    TEAR_DURATION,
    TEAR_RESISTANCE_REDUCTION,
    WEAKEN_DEFENSE_REDUCTION,
    WEAKEN_DURATION,
    StatusEffectManager,
)
from app.services.combat_engine import CombatEngine


# ---------------------------------------------------------------------------
# Element-to-StatusEffect mapping
# ---------------------------------------------------------------------------


class TestElementStatusMap:
    def test_fire_maps_to_burn(self):
        assert ELEMENT_STATUS_MAP[Element.FIRE] == StatusEffectType.BURN

    def test_shadow_maps_to_weaken(self):
        assert ELEMENT_STATUS_MAP[Element.SHADOW] == StatusEffectType.WEAKEN

    def test_blood_maps_to_bleed(self):
        assert ELEMENT_STATUS_MAP[Element.BLOOD] == StatusEffectType.BLEED

    def test_void_maps_to_tear(self):
        assert ELEMENT_STATUS_MAP[Element.VOID] == StatusEffectType.TEAR


# ---------------------------------------------------------------------------
# StatusEffectManager -- application
# ---------------------------------------------------------------------------


class TestStatusEffectApplication:
    def setup_method(self):
        self.manager = StatusEffectManager()

    def test_try_apply_succeeds_when_rng_below_chance(self):
        with patch("app.services.status_effects.random.random", return_value=0.1):
            result = self.manager.try_apply(Element.FIRE)
        assert result is not None
        assert result.effect_type == StatusEffectType.BURN
        assert result.remaining_ticks == BURN_TICKS

    def test_try_apply_fails_when_rng_above_chance(self):
        with patch("app.services.status_effects.random.random", return_value=0.99):
            result = self.manager.try_apply(Element.FIRE)
        assert result is None

    def test_elemental_power_increases_chance(self):
        # Base 20% + 30% elemental power = 50% chance
        with patch("app.services.status_effects.random.random", return_value=0.45):
            result = self.manager.try_apply(Element.SHADOW, elemental_power=0.3)
        assert result is not None
        assert result.effect_type == StatusEffectType.WEAKEN

    def test_force_apply_always_succeeds(self):
        result = self.manager.force_apply(Element.VOID)
        assert result is not None
        assert result.effect_type == StatusEffectType.TEAR
        assert result.remaining_seconds == TEAR_DURATION

    def test_burn_creation(self):
        result = self.manager.force_apply(Element.FIRE)
        assert result.effect_type == StatusEffectType.BURN
        assert result.remaining_ticks == BURN_TICKS
        assert result.source_element == Element.FIRE

    def test_weaken_creation(self):
        result = self.manager.force_apply(Element.SHADOW)
        assert result.effect_type == StatusEffectType.WEAKEN
        assert result.remaining_seconds == WEAKEN_DURATION
        assert result.source_element == Element.SHADOW

    def test_bleed_creation_no_existing(self):
        result = self.manager.force_apply(Element.BLOOD)
        assert result.effect_type == StatusEffectType.BLEED
        assert result.remaining_ticks == BLEED_TICKS
        assert result.stacks == 1

    def test_bleed_stacks_increment(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BLEED,
                    source_element=Element.BLOOD,
                    remaining_ticks=3,
                    stacks=1,
                )
            ],
            max_hp=1000,
        )
        result = self.manager.force_apply(Element.BLOOD, active_effects=active)
        assert result.stacks == 2

    def test_bleed_stacks_cap_at_max(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BLEED,
                    source_element=Element.BLOOD,
                    remaining_ticks=3,
                    stacks=BLEED_MAX_STACKS,
                )
            ],
            max_hp=1000,
        )
        result = self.manager.force_apply(Element.BLOOD, active_effects=active)
        assert result.stacks == BLEED_MAX_STACKS

    def test_tear_creation(self):
        result = self.manager.force_apply(Element.VOID)
        assert result.effect_type == StatusEffectType.TEAR
        assert result.remaining_seconds == TEAR_DURATION
        assert result.source_element == Element.VOID


# ---------------------------------------------------------------------------
# StatusEffectManager -- add/merge effects
# ---------------------------------------------------------------------------


class TestAddEffect:
    def setup_method(self):
        self.manager = StatusEffectManager()

    def test_add_new_effect(self):
        active = ActiveStatusEffects(effects=[], max_hp=1000)
        burn = self.manager.force_apply(Element.FIRE)
        updated = self.manager.add_effect(active, burn)
        assert len(updated.effects) == 1
        assert updated.effects[0].effect_type == StatusEffectType.BURN

    def test_merge_burn_refreshes_ticks(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BURN,
                    source_element=Element.FIRE,
                    remaining_ticks=1,
                )
            ],
            max_hp=1000,
        )
        new_burn = self.manager.force_apply(Element.FIRE)
        updated = self.manager.add_effect(active, new_burn)
        assert len(updated.effects) == 1
        assert updated.effects[0].remaining_ticks == BURN_TICKS

    def test_merge_bleed_updates_stacks(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BLEED,
                    source_element=Element.BLOOD,
                    remaining_ticks=2,
                    stacks=1,
                )
            ],
            max_hp=1000,
        )
        new_bleed = StatusEffect(
            effect_type=StatusEffectType.BLEED,
            source_element=Element.BLOOD,
            remaining_ticks=BLEED_TICKS,
            stacks=2,
        )
        updated = self.manager.add_effect(active, new_bleed)
        assert len(updated.effects) == 1
        assert updated.effects[0].stacks == 2
        assert updated.effects[0].remaining_ticks == BLEED_TICKS

    def test_merge_weaken_refreshes_duration(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.WEAKEN,
                    source_element=Element.SHADOW,
                    remaining_seconds=2.0,
                )
            ],
            max_hp=1000,
        )
        new_weaken = self.manager.force_apply(Element.SHADOW)
        updated = self.manager.add_effect(active, new_weaken)
        assert len(updated.effects) == 1
        assert updated.effects[0].remaining_seconds == WEAKEN_DURATION

    def test_merge_tear_refreshes_duration(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.TEAR,
                    source_element=Element.VOID,
                    remaining_seconds=1.0,
                )
            ],
            max_hp=1000,
        )
        new_tear = self.manager.force_apply(Element.VOID)
        updated = self.manager.add_effect(active, new_tear)
        assert len(updated.effects) == 1
        assert updated.effects[0].remaining_seconds == TEAR_DURATION

    def test_multiple_different_effects(self):
        active = ActiveStatusEffects(effects=[], max_hp=1000)
        burn = self.manager.force_apply(Element.FIRE)
        weaken = self.manager.force_apply(Element.SHADOW)
        active = self.manager.add_effect(active, burn)
        active = self.manager.add_effect(active, weaken)
        assert len(active.effects) == 2
        types = {e.effect_type for e in active.effects}
        assert types == {StatusEffectType.BURN, StatusEffectType.WEAKEN}


# ---------------------------------------------------------------------------
# StatusEffectManager -- tick processing
# ---------------------------------------------------------------------------


class TestProcessTick:
    def setup_method(self):
        self.manager = StatusEffectManager()

    def test_burn_dot_damage(self):
        max_hp = 1000
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BURN,
                    source_element=Element.FIRE,
                    remaining_ticks=3,
                )
            ],
            max_hp=max_hp,
        )
        req = StatusTickRequest(active_effects=active)
        result = self.manager.process_tick(req)
        assert result.dot_damage == int(max_hp * BURN_PCT)  # 50
        assert len(result.remaining_effects) == 1
        assert result.remaining_effects[0].remaining_ticks == 2

    def test_burn_expires_after_last_tick(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BURN,
                    source_element=Element.FIRE,
                    remaining_ticks=1,
                )
            ],
            max_hp=1000,
        )
        req = StatusTickRequest(active_effects=active)
        result = self.manager.process_tick(req)
        assert result.dot_damage == 50
        assert len(result.remaining_effects) == 0
        assert StatusEffectType.BURN in result.expired_effects

    def test_bleed_dot_scales_with_stacks(self):
        max_hp = 1000
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BLEED,
                    source_element=Element.BLOOD,
                    remaining_ticks=5,
                    stacks=3,
                )
            ],
            max_hp=max_hp,
        )
        req = StatusTickRequest(active_effects=active)
        result = self.manager.process_tick(req)
        # 3% * 3 stacks * 1000 = 90
        assert result.dot_damage == int(max_hp * BLEED_PCT * 3)
        assert len(result.remaining_effects) == 1
        assert result.remaining_effects[0].stacks == 3

    def test_bleed_single_stack_damage(self):
        max_hp = 2000
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BLEED,
                    source_element=Element.BLOOD,
                    remaining_ticks=2,
                    stacks=1,
                )
            ],
            max_hp=max_hp,
        )
        req = StatusTickRequest(active_effects=active)
        result = self.manager.process_tick(req)
        assert result.dot_damage == int(max_hp * BLEED_PCT)  # 60

    def test_weaken_defense_modifier(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.WEAKEN,
                    source_element=Element.SHADOW,
                    remaining_seconds=8.0,
                )
            ],
            max_hp=1000,
        )
        req = StatusTickRequest(active_effects=active, tick_interval=2.0)
        result = self.manager.process_tick(req)
        assert result.dot_damage == 0
        assert result.defense_modifier == pytest.approx(
            1.0 - WEAKEN_DEFENSE_REDUCTION
        )
        assert len(result.remaining_effects) == 1
        assert result.remaining_effects[0].remaining_seconds == 6.0

    def test_weaken_expires(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.WEAKEN,
                    source_element=Element.SHADOW,
                    remaining_seconds=2.0,
                )
            ],
            max_hp=1000,
        )
        req = StatusTickRequest(active_effects=active, tick_interval=2.0)
        result = self.manager.process_tick(req)
        assert len(result.remaining_effects) == 0
        assert StatusEffectType.WEAKEN in result.expired_effects

    def test_tear_resistance_modifier(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.TEAR,
                    source_element=Element.VOID,
                    remaining_seconds=10.0,
                )
            ],
            max_hp=1000,
        )
        req = StatusTickRequest(active_effects=active, tick_interval=2.0)
        result = self.manager.process_tick(req)
        assert result.dot_damage == 0
        assert result.resistance_modifier == pytest.approx(
            1.0 - TEAR_RESISTANCE_REDUCTION
        )
        assert len(result.remaining_effects) == 1
        assert result.remaining_effects[0].remaining_seconds == 8.0

    def test_tear_expires(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.TEAR,
                    source_element=Element.VOID,
                    remaining_seconds=1.0,
                )
            ],
            max_hp=1000,
        )
        req = StatusTickRequest(active_effects=active, tick_interval=2.0)
        result = self.manager.process_tick(req)
        assert len(result.remaining_effects) == 0
        assert StatusEffectType.TEAR in result.expired_effects

    def test_combined_burn_and_bleed_dot(self):
        max_hp = 1000
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BURN,
                    source_element=Element.FIRE,
                    remaining_ticks=2,
                ),
                StatusEffect(
                    effect_type=StatusEffectType.BLEED,
                    source_element=Element.BLOOD,
                    remaining_ticks=3,
                    stacks=2,
                ),
            ],
            max_hp=max_hp,
        )
        req = StatusTickRequest(active_effects=active)
        result = self.manager.process_tick(req)
        expected_burn = int(max_hp * BURN_PCT)  # 50
        expected_bleed = int(max_hp * BLEED_PCT * 2)  # 60
        assert result.dot_damage == expected_burn + expected_bleed  # 110

    def test_empty_effects_no_damage(self):
        active = ActiveStatusEffects(effects=[], max_hp=1000)
        req = StatusTickRequest(active_effects=active)
        result = self.manager.process_tick(req)
        assert result.dot_damage == 0
        assert result.defense_modifier == 1.0
        assert result.resistance_modifier == 1.0
        assert len(result.remaining_effects) == 0
        assert len(result.expired_effects) == 0


# ---------------------------------------------------------------------------
# StatusEffectManager -- get_active_modifiers
# ---------------------------------------------------------------------------


class TestGetActiveModifiers:
    def setup_method(self):
        self.manager = StatusEffectManager()

    def test_no_debuffs(self):
        active = ActiveStatusEffects(effects=[], max_hp=1000)
        mods = self.manager.get_active_modifiers(active)
        assert mods["defense_modifier"] == 1.0
        assert mods["resistance_modifier"] == 1.0

    def test_weaken_only(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.WEAKEN,
                    source_element=Element.SHADOW,
                    remaining_seconds=5.0,
                )
            ],
            max_hp=1000,
        )
        mods = self.manager.get_active_modifiers(active)
        assert mods["defense_modifier"] == pytest.approx(0.8)
        assert mods["resistance_modifier"] == 1.0

    def test_tear_only(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.TEAR,
                    source_element=Element.VOID,
                    remaining_seconds=5.0,
                )
            ],
            max_hp=1000,
        )
        mods = self.manager.get_active_modifiers(active)
        assert mods["defense_modifier"] == 1.0
        assert mods["resistance_modifier"] == pytest.approx(0.85)

    def test_dot_effects_dont_affect_modifiers(self):
        active = ActiveStatusEffects(
            effects=[
                StatusEffect(
                    effect_type=StatusEffectType.BURN,
                    source_element=Element.FIRE,
                    remaining_ticks=3,
                ),
                StatusEffect(
                    effect_type=StatusEffectType.BLEED,
                    source_element=Element.BLOOD,
                    remaining_ticks=5,
                    stacks=2,
                ),
            ],
            max_hp=1000,
        )
        mods = self.manager.get_active_modifiers(active)
        assert mods["defense_modifier"] == 1.0
        assert mods["resistance_modifier"] == 1.0


# ---------------------------------------------------------------------------
# CombatEngine -- status effect integration
# ---------------------------------------------------------------------------


class TestCombatEngineStatusIntegration:
    def setup_method(self):
        self.engine = CombatEngine()

    def test_resolve_combat_attempts_status_application(self):
        """When attacker has an element and RNG is favorable, a status
        effect should be applied and listed in effects."""
        from app.models.schemas import CombatAction

        # Both modules share the same random module object, so use a single
        # patch with side_effect: first call = critical check (0.99 = no crit),
        # second call = status effect check (0.1 < 0.2 = apply).
        with patch("app.services.combat_engine.random.random", side_effect=[0.99, 0.1]):
            result = self.engine.resolve_combat(
                CombatAction(
                    attacker_stats={"attack": 50, "critical_rate": 0.0},
                    defender_stats={"defense": 10, "element": "shadow"},
                    action_type="attack",
                    element="fire",
                )
            )
        assert result.applied_status is not None
        assert result.applied_status.effect_type == StatusEffectType.BURN
        assert "applied_burn" in result.effects

    def test_resolve_combat_no_status_without_element(self):
        """No element means no status effect attempt."""
        from app.models.schemas import CombatAction

        with patch("app.services.combat_engine.random.random", return_value=0.99):
            result = self.engine.resolve_combat(
                CombatAction(
                    attacker_stats={"attack": 50, "critical_rate": 0.0},
                    defender_stats={"defense": 10},
                    action_type="attack",
                    element=None,
                )
            )
        assert result.applied_status is None

    def test_resolve_combat_no_status_when_rng_fails(self):
        from app.models.schemas import CombatAction

        with patch("app.services.status_effects.random.random", return_value=0.99), \
             patch("app.services.combat_engine.random.random", return_value=0.99):
            result = self.engine.resolve_combat(
                CombatAction(
                    attacker_stats={"attack": 50, "critical_rate": 0.0},
                    defender_stats={"defense": 10, "element": "shadow"},
                    action_type="attack",
                    element="fire",
                )
            )
        assert result.applied_status is None

    def test_weaken_reduces_effective_defense(self):
        """A weakened defender should take more damage due to reduced defense."""
        from app.models.schemas import CombatAction

        base_action = CombatAction(
            attacker_stats={"attack": 50, "critical_rate": 0.0},
            defender_stats={"defense": 20, "element": "fire"},
            action_type="attack",
            element=None,
        )

        weakened_action = CombatAction(
            attacker_stats={"attack": 50, "critical_rate": 0.0},
            defender_stats={
                "defense": 20,
                "element": "fire",
                "active_effects": {
                    "effects": [
                        {
                            "effect_type": "weaken",
                            "source_element": "shadow",
                            "remaining_seconds": 5.0,
                            "remaining_ticks": 0,
                            "stacks": 1,
                        }
                    ],
                    "max_hp": 1000,
                },
            },
            action_type="attack",
            element=None,
        )

        # Disable crit RNG for deterministic comparison
        with patch("app.services.combat_engine.random.random", return_value=0.99):
            normal_result = self.engine.resolve_combat(base_action)
        with patch("app.services.combat_engine.random.random", return_value=0.99):
            weakened_result = self.engine.resolve_combat(weakened_action)

        # Weakened target has defense 20 * 0.8 = 16, so more damage
        assert weakened_result.damage > normal_result.damage
        assert "weakened" in weakened_result.effects

    def test_torn_amplifies_elemental_advantage(self):
        """A torn defender should take amplified elemental damage."""
        from app.models.schemas import CombatAction

        base_action = CombatAction(
            attacker_stats={"attack": 50, "critical_rate": 0.0},
            defender_stats={"defense": 10, "element": "shadow"},
            action_type="attack",
            element="fire",
        )

        torn_action = CombatAction(
            attacker_stats={"attack": 50, "critical_rate": 0.0},
            defender_stats={
                "defense": 10,
                "element": "shadow",
                "active_effects": {
                    "effects": [
                        {
                            "effect_type": "tear",
                            "source_element": "void",
                            "remaining_seconds": 5.0,
                            "remaining_ticks": 0,
                            "stacks": 1,
                        }
                    ],
                    "max_hp": 1000,
                },
            },
            action_type="attack",
            element="fire",
        )

        with patch("app.services.combat_engine.random.random", return_value=0.99), \
             patch("app.services.status_effects.random.random", return_value=0.99):
            normal_result = self.engine.resolve_combat(base_action)
        with patch("app.services.combat_engine.random.random", return_value=0.99), \
             patch("app.services.status_effects.random.random", return_value=0.99):
            torn_result = self.engine.resolve_combat(torn_action)

        assert torn_result.damage > normal_result.damage
        assert "torn" in torn_result.effects


# ---------------------------------------------------------------------------
# API endpoint -- /api/v1/combat/status-tick
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_status_tick_endpoint_burn(client):
    payload = {
        "active_effects": {
            "effects": [
                {
                    "effect_type": "burn",
                    "source_element": "fire",
                    "remaining_ticks": 3,
                    "remaining_seconds": 0.0,
                    "stacks": 1,
                }
            ],
            "max_hp": 1000,
        },
        "tick_interval": 2.0,
    }
    response = await client.post("/api/v1/combat/status-tick", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["dot_damage"] == 50  # 5% of 1000
    assert len(data["remaining_effects"]) == 1
    assert data["remaining_effects"][0]["remaining_ticks"] == 2


@pytest.mark.anyio
async def test_status_tick_endpoint_bleed_stacks(client):
    payload = {
        "active_effects": {
            "effects": [
                {
                    "effect_type": "bleed",
                    "source_element": "blood",
                    "remaining_ticks": 5,
                    "remaining_seconds": 0.0,
                    "stacks": 3,
                }
            ],
            "max_hp": 2000,
        },
        "tick_interval": 2.0,
    }
    response = await client.post("/api/v1/combat/status-tick", json=payload)
    assert response.status_code == 200
    data = response.json()
    # 3% * 3 stacks * 2000 = 180
    assert data["dot_damage"] == 180


@pytest.mark.anyio
async def test_status_tick_endpoint_weaken_modifier(client):
    payload = {
        "active_effects": {
            "effects": [
                {
                    "effect_type": "weaken",
                    "source_element": "shadow",
                    "remaining_ticks": 0,
                    "remaining_seconds": 8.0,
                    "stacks": 1,
                }
            ],
            "max_hp": 1000,
        },
        "tick_interval": 2.0,
    }
    response = await client.post("/api/v1/combat/status-tick", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["dot_damage"] == 0
    assert data["defense_modifier"] == pytest.approx(0.8)
    assert len(data["remaining_effects"]) == 1
    assert data["remaining_effects"][0]["remaining_seconds"] == 6.0


@pytest.mark.anyio
async def test_status_tick_endpoint_tear_modifier(client):
    payload = {
        "active_effects": {
            "effects": [
                {
                    "effect_type": "tear",
                    "source_element": "void",
                    "remaining_ticks": 0,
                    "remaining_seconds": 10.0,
                    "stacks": 1,
                }
            ],
            "max_hp": 1000,
        },
        "tick_interval": 2.0,
    }
    response = await client.post("/api/v1/combat/status-tick", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["dot_damage"] == 0
    assert data["resistance_modifier"] == pytest.approx(0.85)


@pytest.mark.anyio
async def test_status_tick_endpoint_expiry(client):
    """An effect at its last tick should appear in expired_effects."""
    payload = {
        "active_effects": {
            "effects": [
                {
                    "effect_type": "burn",
                    "source_element": "fire",
                    "remaining_ticks": 1,
                    "remaining_seconds": 0.0,
                    "stacks": 1,
                }
            ],
            "max_hp": 500,
        },
        "tick_interval": 2.0,
    }
    response = await client.post("/api/v1/combat/status-tick", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["dot_damage"] == 25  # 5% of 500
    assert len(data["remaining_effects"]) == 0
    assert "burn" in data["expired_effects"]


@pytest.mark.anyio
async def test_resolve_combat_returns_applied_status(client):
    """The resolve endpoint should include applied_status when it fires."""
    payload = {
        "attacker_stats": {
            "attack": 50,
            "critical_rate": 0.0,
            "elemental_power": 1.0,
        },
        "defender_stats": {"defense": 10, "element": "shadow"},
        "action_type": "attack",
        "element": "fire",
        "combo_multiplier": 1.0,
        "is_dual_wield": False,
    }
    # With elemental_power=1.0, chance = 1.2 so it always applies
    response = await client.post("/api/v1/combat/resolve", json=payload)
    assert response.status_code == 200
    data = response.json()
    # With 120% chance, status should always apply
    assert data["applied_status"] is not None
    assert data["applied_status"]["effect_type"] == "burn"
