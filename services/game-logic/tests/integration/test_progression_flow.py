"""Integration tests for the XP calculation and level-up flow.

Tests the progression endpoints: XP calculation from combat results,
XP accumulation, level-up triggers, stat increases, and edge cases.
"""

import pytest

pytestmark = pytest.mark.anyio


# ---------------------------------------------------------------------------
# XP calculation
# ---------------------------------------------------------------------------


async def test_calculate_xp_basic(client):
    """Basic XP calculation with no bonuses."""
    payload = {
        "enemies_defeated": 10,
        "floor_level": 1,
        "combo_count": 0,
        "time_bonus": 0.0,
        "corruption_bonus": 0.0,
    }
    resp = await client.post("/api/v1/progression/calculate-xp", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    # base = 10 * 25 = 250, floor_mult = 1.0 + (1 * 0.1) = 1.1
    # total = 250 * 1.1 * 1.0 * 1.0 * 1.0 = 275
    assert data["xp_earned"] == 275
    assert data["breakdown"]["base_xp"] == 250
    assert data["breakdown"]["floor_multiplier"] == pytest.approx(1.1)


async def test_calculate_xp_with_combo(client):
    """XP calculation with combo bonus (2% per combo)."""
    payload = {
        "enemies_defeated": 10,
        "floor_level": 1,
        "combo_count": 5,
        "time_bonus": 0.0,
        "corruption_bonus": 0.0,
    }
    resp = await client.post("/api/v1/progression/calculate-xp", json=payload)
    data = resp.json()

    # base = 250, floor_mult = 1.1, combo_bonus = 5 * 0.02 = 0.10
    # total = int(250 * 1.1 * 1.10 * 1.0 * 1.0) = int(302.5) = 302
    assert data["xp_earned"] == 302
    assert data["breakdown"]["combo_bonus"] == pytest.approx(0.10)


async def test_calculate_xp_with_all_bonuses(client):
    """XP calculation with all bonuses active."""
    payload = {
        "enemies_defeated": 20,
        "floor_level": 5,
        "combo_count": 10,
        "time_bonus": 0.5,
        "corruption_bonus": 0.25,
    }
    resp = await client.post("/api/v1/progression/calculate-xp", json=payload)
    data = resp.json()

    # base = 20 * 25 = 500
    # floor_mult = 1.0 + (5 * 0.1) = 1.5
    # combo_bonus = 10 * 0.02 = 0.20
    # time_mult = 1.0 + 0.5 = 1.5
    # corruption_mult = 1.0 + 0.25 = 1.25
    # total = int(500 * 1.5 * 1.20 * 1.5 * 1.25) = int(1687.5) = 1687
    assert data["xp_earned"] == 1687
    assert data["breakdown"]["enemies_defeated"] == 20


async def test_calculate_xp_zero_enemies(client):
    """Zero enemies defeated should yield zero XP."""
    payload = {
        "enemies_defeated": 0,
        "floor_level": 10,
        "combo_count": 50,
        "time_bonus": 1.0,
        "corruption_bonus": 1.0,
    }
    resp = await client.post("/api/v1/progression/calculate-xp", json=payload)
    data = resp.json()
    assert data["xp_earned"] == 0


async def test_calculate_xp_high_floor(client):
    """Higher floors should give proportionally more XP."""
    base = {
        "enemies_defeated": 5,
        "floor_level": 1,
        "combo_count": 0,
        "time_bonus": 0.0,
        "corruption_bonus": 0.0,
    }
    high_floor = {**base, "floor_level": 10}

    resp_low = await client.post("/api/v1/progression/calculate-xp", json=base)
    resp_high = await client.post("/api/v1/progression/calculate-xp", json=high_floor)

    assert resp_high.json()["xp_earned"] > resp_low.json()["xp_earned"]


# ---------------------------------------------------------------------------
# Level-up
# ---------------------------------------------------------------------------


async def test_level_up_no_level_gained(client):
    """Adding XP that does not reach the threshold should not level up."""
    payload = {
        "current_level": 1,
        "current_xp": 0,
        "xp_to_add": 100,  # Need 400 (2*2*100) for level 2
    }
    resp = await client.post("/api/v1/progression/level-up", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["new_level"] == 1
    assert data["new_xp"] == 100
    assert data["levels_gained"] == 0
    assert all(v == 0 for v in data["stat_increases"].values())


async def test_level_up_single_level(client):
    """Adding enough XP for exactly one level should level up once."""
    # Level 2 requires 2*2*100 = 400 XP
    payload = {
        "current_level": 1,
        "current_xp": 0,
        "xp_to_add": 400,
    }
    resp = await client.post("/api/v1/progression/level-up", json=payload)
    data = resp.json()

    assert data["new_level"] == 2
    assert data["new_xp"] == 0
    assert data["levels_gained"] == 1
    # +2 to each stat per level
    assert data["stat_increases"]["strength"] == 2
    assert data["stat_increases"]["agility"] == 2
    assert data["stat_increases"]["intellect"] == 2
    assert data["stat_increases"]["vitality"] == 2
    assert data["stat_increases"]["luck"] == 2


async def test_level_up_multiple_levels(client):
    """Adding a large amount of XP should trigger multiple level-ups."""
    # Level 2 = 400 XP, Level 3 = 900 XP => total 1300 for levels 1->3
    payload = {
        "current_level": 1,
        "current_xp": 0,
        "xp_to_add": 1400,  # 400 (lvl2) + 900 (lvl3) = 1300, leftover = 100
    }
    resp = await client.post("/api/v1/progression/level-up", json=payload)
    data = resp.json()

    assert data["new_level"] == 3
    assert data["new_xp"] == 100
    assert data["levels_gained"] == 2
    # +2 per stat per level, 2 levels = +4 each
    assert data["stat_increases"]["strength"] == 4
    assert data["stat_increases"]["agility"] == 4


async def test_level_up_with_existing_xp(client):
    """Level-up should account for existing XP before adding new XP."""
    # Level 2 requires 400 XP. Current: 350, add: 100 => total 450 => level 2 + 50 leftover
    payload = {
        "current_level": 1,
        "current_xp": 350,
        "xp_to_add": 100,
    }
    resp = await client.post("/api/v1/progression/level-up", json=payload)
    data = resp.json()

    assert data["new_level"] == 2
    assert data["new_xp"] == 50
    assert data["levels_gained"] == 1


async def test_level_up_stat_increases_scale_with_levels(client):
    """Stat increases should scale linearly with levels gained."""
    # Give enough XP to gain 5 levels from level 1
    # L2=400, L3=900, L4=1600, L5=2500, L6=3600 => total = 9000
    payload = {
        "current_level": 1,
        "current_xp": 0,
        "xp_to_add": 9000,
    }
    resp = await client.post("/api/v1/progression/level-up", json=payload)
    data = resp.json()

    assert data["new_level"] == 6
    assert data["levels_gained"] == 5
    # 5 levels * 2 per stat = 10
    for stat in ["strength", "agility", "intellect", "vitality", "luck"]:
        assert data["stat_increases"][stat] == 10


# ---------------------------------------------------------------------------
# XP threshold formula
# ---------------------------------------------------------------------------


async def test_xp_threshold_formula(client):
    """Verify the XP threshold: level^2 * 100."""
    # Level 5 requires 5*5*100 = 2500 XP
    payload = {
        "current_level": 4,
        "current_xp": 0,
        "xp_to_add": 2500,
    }
    resp = await client.post("/api/v1/progression/level-up", json=payload)
    data = resp.json()

    assert data["new_level"] == 5
    assert data["new_xp"] == 0
    assert data["levels_gained"] == 1


async def test_xp_threshold_just_below(client):
    """XP just below the threshold should not trigger level-up."""
    # Level 5 requires 2500 XP
    payload = {
        "current_level": 4,
        "current_xp": 0,
        "xp_to_add": 2499,
    }
    resp = await client.post("/api/v1/progression/level-up", json=payload)
    data = resp.json()

    assert data["new_level"] == 4
    assert data["new_xp"] == 2499
    assert data["levels_gained"] == 0
