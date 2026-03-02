"""Integration tests for the combat resolution flow.

Tests the full combat endpoint behaviour including elemental interactions,
status effect application, dual-wield bonuses, combo multipliers, and the
status-tick endpoint for effect persistence.
"""

import pytest
from unittest.mock import patch

pytestmark = pytest.mark.anyio


# ---------------------------------------------------------------------------
# Basic combat resolution
# ---------------------------------------------------------------------------


async def test_resolve_combat_basic_attack(client):
    """POST /combat/resolve with a plain attack returns valid damage."""
    payload = {
        "attacker_stats": {"attack": 20, "defense": 5, "critical_rate": 0.0},
        "defender_stats": {"defense": 8},
        "action_type": "attack",
    }
    resp = await client.post("/api/v1/combat/resolve", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["damage"] >= 1
    assert data["is_critical"] is False
    assert data["combo_triggered"] is False
    # No element => no elemental effects
    assert "elemental_advantage" not in data["effects"]
    assert "elemental_disadvantage" not in data["effects"]


async def test_resolve_combat_skill_multiplier(client):
    """Skill actions should apply a 1.5x multiplier compared to attack."""
    base_payload = {
        "attacker_stats": {"attack": 30, "defense": 5, "critical_rate": 0.0},
        "defender_stats": {"defense": 10},
        "action_type": "attack",
    }
    skill_payload = {**base_payload, "action_type": "skill"}

    with patch("app.services.combat_engine.random.random", return_value=0.99):
        resp_atk = await client.post("/api/v1/combat/resolve", json=base_payload)
        resp_skill = await client.post("/api/v1/combat/resolve", json=skill_payload)

    atk_dmg = resp_atk.json()["damage"]
    skill_dmg = resp_skill.json()["damage"]
    # skill damage should be 1.5x attack damage (no crits, no element)
    assert skill_dmg == int(atk_dmg * 1.5)


async def test_resolve_combat_ultimate_multiplier(client):
    """Ultimate actions should apply a 2.5x multiplier."""
    payload = {
        "attacker_stats": {"attack": 40, "defense": 5, "critical_rate": 0.0},
        "defender_stats": {"defense": 10},
        "action_type": "attack",
    }
    ult_payload = {**payload, "action_type": "ultimate"}

    with patch("app.services.combat_engine.random.random", return_value=0.99):
        resp_atk = await client.post("/api/v1/combat/resolve", json=payload)
        resp_ult = await client.post("/api/v1/combat/resolve", json=ult_payload)

    atk_dmg = resp_atk.json()["damage"]
    ult_dmg = resp_ult.json()["damage"]
    assert ult_dmg == int(atk_dmg * 2.5)


# ---------------------------------------------------------------------------
# Elemental interactions
# ---------------------------------------------------------------------------


async def test_fire_vs_shadow_elemental_advantage(client):
    """Fire attacking Shadow should get 1.5x element multiplier."""
    payload = {
        "attacker_stats": {
            "attack": 20,
            "defense": 5,
            "critical_rate": 0.0,
            "elemental_power": 0.0,
        },
        "defender_stats": {"defense": 5, "element": "shadow"},
        "action_type": "attack",
        "element": "fire",
    }
    # Disable crits and status application
    with patch("app.services.combat_engine.random.random", return_value=0.99):
        resp = await client.post("/api/v1/combat/resolve", json=payload)

    data = resp.json()
    assert resp.status_code == 200
    assert "elemental_advantage" in data["effects"]
    assert data["element_bonus"] == pytest.approx(0.5, abs=0.01)


async def test_shadow_vs_fire_elemental_disadvantage(client):
    """Shadow attacking Fire should get 0.75x element multiplier."""
    payload = {
        "attacker_stats": {
            "attack": 20,
            "defense": 5,
            "critical_rate": 0.0,
            "elemental_power": 0.0,
        },
        "defender_stats": {"defense": 5, "element": "fire"},
        "action_type": "attack",
        "element": "shadow",
    }
    with patch("app.services.combat_engine.random.random", return_value=0.99):
        resp = await client.post("/api/v1/combat/resolve", json=payload)

    data = resp.json()
    assert "elemental_disadvantage" in data["effects"]
    assert data["element_bonus"] == pytest.approx(-0.25, abs=0.01)


async def test_same_element_neutral(client):
    """Same-element combat should have 1.0x multiplier (no bonus)."""
    payload = {
        "attacker_stats": {
            "attack": 20,
            "defense": 5,
            "critical_rate": 0.0,
            "elemental_power": 0.0,
        },
        "defender_stats": {"defense": 5, "element": "fire"},
        "action_type": "attack",
        "element": "fire",
    }
    with patch("app.services.combat_engine.random.random", return_value=0.99):
        resp = await client.post("/api/v1/combat/resolve", json=payload)

    data = resp.json()
    assert data["element_bonus"] == pytest.approx(0.0, abs=0.01)
    assert "elemental_advantage" not in data["effects"]
    assert "elemental_disadvantage" not in data["effects"]


# ---------------------------------------------------------------------------
# Dual wield and combo
# ---------------------------------------------------------------------------


async def test_dual_wield_bonus(client):
    """Dual wield should add a 30% damage bonus (2 * 15%)."""
    base_payload = {
        "attacker_stats": {"attack": 20, "defense": 5, "critical_rate": 0.0},
        "defender_stats": {"defense": 5},
        "action_type": "attack",
        "is_dual_wield": False,
    }
    dw_payload = {**base_payload, "is_dual_wield": True}

    with patch("app.services.combat_engine.random.random", return_value=0.99):
        resp_base = await client.post("/api/v1/combat/resolve", json=base_payload)
        resp_dw = await client.post("/api/v1/combat/resolve", json=dw_payload)

    base_dmg = resp_base.json()["damage"]
    dw_dmg = resp_dw.json()["damage"]
    assert dw_dmg == int(base_dmg * 1.3)
    assert "dual_wield" in resp_dw.json()["effects"]


async def test_combo_multiplier(client):
    """Combo multiplier should scale damage accordingly."""
    base_payload = {
        "attacker_stats": {"attack": 20, "defense": 5, "critical_rate": 0.0},
        "defender_stats": {"defense": 5},
        "action_type": "attack",
        "combo_multiplier": 1.0,
    }
    combo_payload = {**base_payload, "combo_multiplier": 2.0}

    with patch("app.services.combat_engine.random.random", return_value=0.99):
        resp_base = await client.post("/api/v1/combat/resolve", json=base_payload)
        resp_combo = await client.post("/api/v1/combat/resolve", json=combo_payload)

    base_dmg = resp_base.json()["damage"]
    combo_dmg = resp_combo.json()["damage"]
    assert combo_dmg == base_dmg * 2
    assert "combo" in resp_combo.json()["effects"]


# ---------------------------------------------------------------------------
# Critical hits
# ---------------------------------------------------------------------------


async def test_critical_hit_doubles_damage(client):
    """A guaranteed critical hit should double the damage."""
    payload = {
        "attacker_stats": {"attack": 20, "defense": 5, "critical_rate": 1.0},
        "defender_stats": {"defense": 5},
        "action_type": "attack",
    }
    # Force crit (random < 1.0 is always true, but let's be explicit)
    with patch("app.services.combat_engine.random.random", return_value=0.0):
        resp_crit = await client.post("/api/v1/combat/resolve", json=payload)
    with patch("app.services.combat_engine.random.random", return_value=0.99):
        no_crit_payload = {**payload}
        no_crit_payload["attacker_stats"] = {**payload["attacker_stats"], "critical_rate": 0.0}
        resp_no_crit = await client.post("/api/v1/combat/resolve", json=no_crit_payload)

    crit_data = resp_crit.json()
    no_crit_data = resp_no_crit.json()
    assert crit_data["is_critical"] is True
    assert crit_data["damage"] == no_crit_data["damage"] * 2
    assert "critical_hit" in crit_data["effects"]


# ---------------------------------------------------------------------------
# Status effect application via combat
# ---------------------------------------------------------------------------


async def test_fire_attack_applies_burn_status(client):
    """Fire attack with guaranteed status roll should apply Burn."""
    payload = {
        "attacker_stats": {
            "attack": 20,
            "defense": 5,
            "critical_rate": 0.0,
            "elemental_power": 1.0,  # high power to guarantee application
        },
        "defender_stats": {"defense": 5, "element": "shadow"},
        "action_type": "attack",
        "element": "fire",
    }
    # random.random returns 0.0 which is < 0.20 + 1.0 = 1.2 => always applies
    with patch("app.services.combat_engine.random.random", return_value=0.0):
        resp = await client.post("/api/v1/combat/resolve", json=payload)

    data = resp.json()
    assert data["applied_status"] is not None
    assert data["applied_status"]["effect_type"] == "burn"
    assert data["applied_status"]["source_element"] == "fire"
    assert data["applied_status"]["remaining_ticks"] == 3
    assert "applied_burn" in data["effects"]


async def test_shadow_attack_applies_weaken_status(client):
    """Shadow attack should apply Weaken status effect."""
    payload = {
        "attacker_stats": {
            "attack": 20,
            "defense": 5,
            "critical_rate": 0.0,
            "elemental_power": 1.0,
        },
        "defender_stats": {"defense": 5, "element": "fire"},
        "action_type": "attack",
        "element": "shadow",
    }
    with patch("app.services.combat_engine.random.random", return_value=0.0):
        resp = await client.post("/api/v1/combat/resolve", json=payload)

    data = resp.json()
    assert data["applied_status"] is not None
    assert data["applied_status"]["effect_type"] == "weaken"
    assert data["applied_status"]["remaining_seconds"] == 8.0


# ---------------------------------------------------------------------------
# Status tick endpoint
# ---------------------------------------------------------------------------


async def test_status_tick_burn_damage(client):
    """Status tick should deal 5% max HP as Burn damage per tick."""
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
    resp = await client.post("/api/v1/combat/status-tick", json=payload)
    data = resp.json()

    assert resp.status_code == 200
    assert data["dot_damage"] == 50  # 5% of 1000
    assert len(data["remaining_effects"]) == 1
    assert data["remaining_effects"][0]["remaining_ticks"] == 2
    assert data["expired_effects"] == []


async def test_status_tick_burn_expires(client):
    """Burn should expire when remaining_ticks reaches 0."""
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
            "max_hp": 1000,
        },
        "tick_interval": 2.0,
    }
    resp = await client.post("/api/v1/combat/status-tick", json=payload)
    data = resp.json()

    assert data["dot_damage"] == 50
    assert data["remaining_effects"] == []
    assert "burn" in data["expired_effects"]


async def test_status_tick_weaken_defense_modifier(client):
    """Weaken should reduce defense modifier by 20%."""
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
    resp = await client.post("/api/v1/combat/status-tick", json=payload)
    data = resp.json()

    assert data["defense_modifier"] == pytest.approx(0.8, abs=0.01)
    assert data["dot_damage"] == 0
    assert len(data["remaining_effects"]) == 1
    assert data["remaining_effects"][0]["remaining_seconds"] == pytest.approx(6.0)


async def test_status_tick_bleed_stacks(client):
    """Bleed at 2 stacks should deal 2 * 3% max HP per tick."""
    payload = {
        "active_effects": {
            "effects": [
                {
                    "effect_type": "bleed",
                    "source_element": "blood",
                    "remaining_ticks": 5,
                    "remaining_seconds": 0.0,
                    "stacks": 2,
                }
            ],
            "max_hp": 1000,
        },
        "tick_interval": 2.0,
    }
    resp = await client.post("/api/v1/combat/status-tick", json=payload)
    data = resp.json()

    # 3% * 2 stacks * 1000 = 60
    assert data["dot_damage"] == 60
    assert data["remaining_effects"][0]["stacks"] == 2
    assert data["remaining_effects"][0]["remaining_ticks"] == 4


async def test_status_tick_tear_resistance_modifier(client):
    """Tear should reduce resistance modifier by 15%."""
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
    resp = await client.post("/api/v1/combat/status-tick", json=payload)
    data = resp.json()

    assert data["resistance_modifier"] == pytest.approx(0.85, abs=0.01)
    assert data["remaining_effects"][0]["remaining_seconds"] == pytest.approx(8.0)


async def test_status_tick_multiple_effects(client):
    """Multiple concurrent effects should all process in a single tick."""
    payload = {
        "active_effects": {
            "effects": [
                {
                    "effect_type": "burn",
                    "source_element": "fire",
                    "remaining_ticks": 2,
                    "remaining_seconds": 0.0,
                    "stacks": 1,
                },
                {
                    "effect_type": "weaken",
                    "source_element": "shadow",
                    "remaining_ticks": 0,
                    "remaining_seconds": 4.0,
                    "stacks": 1,
                },
                {
                    "effect_type": "bleed",
                    "source_element": "blood",
                    "remaining_ticks": 3,
                    "remaining_seconds": 0.0,
                    "stacks": 1,
                },
            ],
            "max_hp": 1000,
        },
        "tick_interval": 2.0,
    }
    resp = await client.post("/api/v1/combat/status-tick", json=payload)
    data = resp.json()

    # Burn: 50, Bleed 1 stack: 30 => total 80
    assert data["dot_damage"] == 80
    assert data["defense_modifier"] == pytest.approx(0.8, abs=0.01)
    assert len(data["remaining_effects"]) == 3
