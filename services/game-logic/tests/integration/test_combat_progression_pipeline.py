"""End-to-end integration tests for the combat -> XP -> level-up pipeline.

These tests call multiple endpoints sequentially to verify the full flow:
1. POST /combat/resolve -> get combat result
2. POST /progression/calculate-xp -> get XP earned
3. POST /progression/level-up -> apply XP and check level-up
"""

import pytest
from unittest.mock import patch

pytestmark = pytest.mark.anyio


async def test_single_combat_to_xp_pipeline(client):
    """Full pipeline: one combat -> calculate XP -> attempt level-up."""
    # Step 1: Resolve combat (Fire vs Shadow, elemental advantage)
    combat_payload = {
        "attacker_stats": {
            "attack": 30,
            "defense": 10,
            "critical_rate": 0.0,
            "elemental_power": 0.0,
        },
        "defender_stats": {"defense": 10, "element": "shadow"},
        "action_type": "skill",
        "element": "fire",
    }
    with patch("app.services.combat_engine.random.random", return_value=0.99):
        combat_resp = await client.post("/api/v1/combat/resolve", json=combat_payload)

    assert combat_resp.status_code == 200
    combat_data = combat_resp.json()
    assert combat_data["damage"] > 0
    assert "elemental_advantage" in combat_data["effects"]

    # Step 2: Calculate XP from the dungeon run
    xp_payload = {
        "enemies_defeated": 5,
        "floor_level": 1,
        "combo_count": 3,
        "time_bonus": 0.0,
        "corruption_bonus": 0.0,
    }
    xp_resp = await client.post("/api/v1/progression/calculate-xp", json=xp_payload)
    assert xp_resp.status_code == 200
    xp_data = xp_resp.json()
    assert xp_data["xp_earned"] > 0

    # Step 3: Apply XP to a level 1 character
    levelup_payload = {
        "current_level": 1,
        "current_xp": 0,
        "xp_to_add": xp_data["xp_earned"],
    }
    levelup_resp = await client.post("/api/v1/progression/level-up", json=levelup_payload)
    assert levelup_resp.status_code == 200
    levelup_data = levelup_resp.json()

    # XP earned should be stored even if not enough for level-up
    assert levelup_data["new_xp"] >= 0
    assert levelup_data["new_level"] >= 1


async def test_multiple_combats_accumulate_xp_for_levelup(client):
    """Multiple combat runs accumulate XP until level-up is triggered."""
    current_level = 1
    current_xp = 0

    # Simulate 5 dungeon runs
    for i in range(5):
        # Each run: 10 enemies on increasing floors with some combos
        xp_payload = {
            "enemies_defeated": 10,
            "floor_level": i + 1,
            "combo_count": i * 2,
            "time_bonus": 0.1,
            "corruption_bonus": 0.0,
        }
        xp_resp = await client.post("/api/v1/progression/calculate-xp", json=xp_payload)
        xp_data = xp_resp.json()

        # Apply XP
        levelup_payload = {
            "current_level": current_level,
            "current_xp": current_xp,
            "xp_to_add": xp_data["xp_earned"],
        }
        levelup_resp = await client.post("/api/v1/progression/level-up", json=levelup_payload)
        levelup_data = levelup_resp.json()

        # Update state for next iteration
        current_level = levelup_data["new_level"]
        current_xp = levelup_data["new_xp"]

    # After 5 runs with increasing floors/combos, should have leveled up
    assert current_level > 1, (
        f"Expected at least level 2 after 5 runs, got level {current_level}"
    )


async def test_elemental_combat_with_status_then_xp(client):
    """Fire combat applies Burn, then ticks damage, then awards XP."""
    # Step 1: Fire attack that applies Burn
    combat_payload = {
        "attacker_stats": {
            "attack": 25,
            "defense": 5,
            "critical_rate": 0.0,
            "elemental_power": 1.0,
        },
        "defender_stats": {"defense": 8, "element": "shadow"},
        "action_type": "attack",
        "element": "fire",
    }
    with patch("app.services.combat_engine.random.random", return_value=0.0):
        combat_resp = await client.post("/api/v1/combat/resolve", json=combat_payload)

    combat_data = combat_resp.json()
    assert combat_data["applied_status"] is not None
    assert combat_data["applied_status"]["effect_type"] == "burn"

    # Step 2: Process 3 ticks of Burn (should expire after 3)
    burn_effect = combat_data["applied_status"]
    total_dot_damage = 0

    for tick in range(3):
        tick_payload = {
            "active_effects": {
                "effects": [burn_effect],
                "max_hp": 500,
            },
            "tick_interval": 2.0,
        }
        tick_resp = await client.post("/api/v1/combat/status-tick", json=tick_payload)
        tick_data = tick_resp.json()
        total_dot_damage += tick_data["dot_damage"]

        if tick_data["remaining_effects"]:
            burn_effect = tick_data["remaining_effects"][0]
        else:
            # Burn expired
            assert "burn" in tick_data["expired_effects"]
            break

    # 3 ticks * 5% of 500 HP = 3 * 25 = 75 total DoT damage
    assert total_dot_damage == 75

    # Step 3: Calculate XP from the combat encounter
    xp_payload = {
        "enemies_defeated": 1,
        "floor_level": 3,
        "combo_count": 0,
        "time_bonus": 0.0,
        "corruption_bonus": 0.0,
    }
    xp_resp = await client.post("/api/v1/progression/calculate-xp", json=xp_payload)
    assert xp_resp.json()["xp_earned"] > 0


async def test_weakened_defender_takes_more_damage_then_levels_up(client):
    """Defender with Weaken status takes more damage; attacker earns XP and levels up."""
    # Step 1: Attack a weakened defender (Weaken reduces defense by 20%)
    combat_payload = {
        "attacker_stats": {
            "attack": 50,
            "defense": 10,
            "critical_rate": 0.0,
            "elemental_power": 0.0,
        },
        "defender_stats": {
            "defense": 20,
            "element": "fire",
            "active_effects": {
                "effects": [
                    {
                        "effect_type": "weaken",
                        "source_element": "shadow",
                        "remaining_ticks": 0,
                        "remaining_seconds": 6.0,
                        "stacks": 1,
                    }
                ],
                "max_hp": 800,
            },
        },
        "action_type": "attack",
    }

    with patch("app.services.combat_engine.random.random", return_value=0.99):
        weakened_resp = await client.post("/api/v1/combat/resolve", json=combat_payload)

    weakened_data = weakened_resp.json()
    assert "weakened" in weakened_data["effects"]

    # Compare with a non-weakened defender
    normal_payload = {
        "attacker_stats": {
            "attack": 50,
            "defense": 10,
            "critical_rate": 0.0,
            "elemental_power": 0.0,
        },
        "defender_stats": {"defense": 20},
        "action_type": "attack",
    }
    with patch("app.services.combat_engine.random.random", return_value=0.99):
        normal_resp = await client.post("/api/v1/combat/resolve", json=normal_payload)

    # Weakened defender should take more damage
    assert weakened_data["damage"] > normal_resp.json()["damage"]

    # Step 2: Give enough XP to level up
    levelup_payload = {
        "current_level": 1,
        "current_xp": 0,
        "xp_to_add": 500,  # > 400 needed for level 2
    }
    levelup_resp = await client.post("/api/v1/progression/level-up", json=levelup_payload)
    levelup_data = levelup_resp.json()

    assert levelup_data["new_level"] == 2
    assert levelup_data["levels_gained"] == 1
    assert levelup_data["stat_increases"]["strength"] == 2


async def test_full_pipeline_combat_xp_levelup_talent(client):
    """Full pipeline: combat -> XP -> level-up -> talent allocation."""
    # Step 1: Resolve a strong combat encounter
    combat_payload = {
        "attacker_stats": {
            "attack": 40,
            "defense": 10,
            "critical_rate": 0.0,
            "elemental_power": 0.0,
        },
        "defender_stats": {"defense": 10, "element": "shadow"},
        "action_type": "ultimate",
        "element": "fire",
        "combo_multiplier": 1.5,
    }
    with patch("app.services.combat_engine.random.random", return_value=0.99):
        combat_resp = await client.post("/api/v1/combat/resolve", json=combat_payload)

    assert combat_resp.status_code == 200
    assert combat_resp.json()["damage"] > 0

    # Step 2: Calculate XP from a big dungeon clear
    xp_payload = {
        "enemies_defeated": 50,
        "floor_level": 10,
        "combo_count": 20,
        "time_bonus": 0.5,
        "corruption_bonus": 0.3,
    }
    xp_resp = await client.post("/api/v1/progression/calculate-xp", json=xp_payload)
    xp_earned = xp_resp.json()["xp_earned"]
    assert xp_earned > 0

    # Step 3: Level up with the earned XP
    levelup_payload = {
        "current_level": 1,
        "current_xp": 0,
        "xp_to_add": xp_earned,
    }
    levelup_resp = await client.post("/api/v1/progression/level-up", json=levelup_payload)
    levelup_data = levelup_resp.json()
    levels_gained = levelup_data["levels_gained"]

    assert levels_gained >= 1, f"Expected at least 1 level gained from {xp_earned} XP"

    # Step 4: Allocate a talent point from the level-ups
    talent_payload = {
        "tree": "offense",
        "talent_id": "power_strike",
        "current_allocations": {},
        "available_points": levels_gained,
    }
    talent_resp = await client.post("/api/v1/progression/talent-tree", json=talent_payload)
    talent_data = talent_resp.json()

    assert talent_data["success"] is True
    assert talent_data["remaining_points"] == levels_gained - 1
    assert talent_data["new_allocations"]["offense.power_strike"] == 1


async def test_repeated_combats_with_status_effects_accumulate(client):
    """Multiple combats with Blood element stack Bleed, then award cumulative XP."""
    # Combat 1: Apply Bleed (1 stack)
    combat1 = {
        "attacker_stats": {
            "attack": 20,
            "defense": 5,
            "critical_rate": 0.0,
            "elemental_power": 1.0,
        },
        "defender_stats": {"defense": 5, "element": "void"},
        "action_type": "attack",
        "element": "blood",
    }
    with patch("app.services.combat_engine.random.random", return_value=0.0):
        resp1 = await client.post("/api/v1/combat/resolve", json=combat1)

    data1 = resp1.json()
    assert data1["applied_status"] is not None
    assert data1["applied_status"]["effect_type"] == "bleed"
    assert data1["applied_status"]["stacks"] == 1

    # Combat 2: Apply Bleed again (should be stack 2 with active_effects)
    combat2 = {
        "attacker_stats": {
            "attack": 20,
            "defense": 5,
            "critical_rate": 0.0,
            "elemental_power": 1.0,
        },
        "defender_stats": {
            "defense": 5,
            "element": "void",
            "active_effects": {
                "effects": [
                    {
                        "effect_type": "bleed",
                        "source_element": "blood",
                        "remaining_ticks": 5,
                        "remaining_seconds": 0.0,
                        "stacks": 1,
                    }
                ],
                "max_hp": 1000,
            },
        },
        "action_type": "attack",
        "element": "blood",
    }
    with patch("app.services.combat_engine.random.random", return_value=0.0):
        resp2 = await client.post("/api/v1/combat/resolve", json=combat2)

    data2 = resp2.json()
    assert data2["applied_status"] is not None
    assert data2["applied_status"]["effect_type"] == "bleed"
    assert data2["applied_status"]["stacks"] == 2

    # Tick the 2-stack bleed to verify increased damage
    tick_payload = {
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
    tick_resp = await client.post("/api/v1/combat/status-tick", json=tick_payload)
    # 2 stacks * 3% * 1000 = 60
    assert tick_resp.json()["dot_damage"] == 60

    # After the combats, calculate XP
    xp_payload = {
        "enemies_defeated": 2,
        "floor_level": 3,
        "combo_count": 1,
        "time_bonus": 0.0,
        "corruption_bonus": 0.0,
    }
    xp_resp = await client.post("/api/v1/progression/calculate-xp", json=xp_payload)
    assert xp_resp.json()["xp_earned"] > 0


async def test_high_level_progression_pipeline(client):
    """Verify progression at higher levels requires more XP."""
    # Level 10 -> 11 requires 11*11*100 = 12100 XP
    levelup_payload = {
        "current_level": 10,
        "current_xp": 0,
        "xp_to_add": 12000,  # Not quite enough
    }
    resp = await client.post("/api/v1/progression/level-up", json=levelup_payload)
    data = resp.json()
    assert data["new_level"] == 10
    assert data["levels_gained"] == 0
    assert data["new_xp"] == 12000

    # Add the remaining 100 XP
    levelup_payload2 = {
        "current_level": 10,
        "current_xp": 12000,
        "xp_to_add": 200,
    }
    resp2 = await client.post("/api/v1/progression/level-up", json=levelup_payload2)
    data2 = resp2.json()
    assert data2["new_level"] == 11
    assert data2["levels_gained"] == 1
    assert data2["new_xp"] == 100  # 12200 - 12100 = 100 leftover
