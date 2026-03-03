"""Tests for the Corrupted Guardian boss fight.

Covers: boss engine unit tests (phase transitions, damage calc, loot,
vulnerability, enrage, elemental resistance) and API endpoint integration tests.
"""

import pytest

from app.models.boss_schemas import (
    BossAttackType,
    BossDamageRequest,
    BossPhase,
    BossStartRequest,
    BossStateType,
)
from app.models.schemas import Element
from app.services.boss_engine import BossEngine


# ---------------------------------------------------------------------------
# Unit tests — BossEngine
# ---------------------------------------------------------------------------


class TestBossEngineStartFight:
    """Test boss fight initialization."""

    def setup_method(self):
        self.engine = BossEngine()

    def test_start_creates_boss_state(self):
        req = BossStartRequest(
            player_level=10,
            player_stats={"attack": 50, "defense": 20, "critical_rate": 0.1},
        )
        resp = self.engine.start_fight(req)
        assert resp.boss_state.current_hp == 2500
        assert resp.boss_state.max_hp == 2500
        assert resp.boss_state.phase == BossPhase.PHASE_1
        assert resp.boss_state.fight_started is True

    def test_start_returns_arena_config(self):
        req = BossStartRequest(
            player_level=10, player_stats={"attack": 50}
        )
        resp = self.engine.start_fight(req)
        assert resp.arena_config["diameter"] == 800
        assert resp.arena_config["pillars"] == 4


class TestBossEngineDamage:
    """Test damage application and phase transitions."""

    def setup_method(self):
        self.engine = BossEngine()
        self.engine.start_fight(
            BossStartRequest(
                player_level=10,
                player_stats={"attack": 50, "defense": 20},
            )
        )

    def test_damage_reduces_hp(self):
        req = BossDamageRequest(damage=100)
        resp = self.engine.apply_damage(req)
        # 100 - 22 defense = 78 actual damage
        assert resp.actual_damage == 78
        assert resp.boss_state.current_hp == 2500 - 78

    def test_fire_damage_is_immune(self):
        req = BossDamageRequest(damage=100, element=Element.FIRE)
        resp = self.engine.apply_damage(req)
        assert resp.actual_damage == 0
        assert resp.boss_state.current_hp == 2500

    def test_shadow_damage_is_resisted(self):
        req = BossDamageRequest(damage=100, element=Element.SHADOW)
        resp = self.engine.apply_damage(req)
        # (100 - 22) * 0.8 = 62.4 -> 62
        assert resp.actual_damage == 62

    def test_void_damage_half_resisted_phase_1(self):
        req = BossDamageRequest(damage=100, element=Element.VOID)
        resp = self.engine.apply_damage(req)
        # (100 - 22) * 0.5 = 39
        assert resp.actual_damage == 39

    def test_blood_damage_normal(self):
        req = BossDamageRequest(damage=100, element=Element.BLOOD)
        resp = self.engine.apply_damage(req)
        # 100 - 22 = 78 (no element modifier for blood)
        assert resp.actual_damage == 78

    def test_minimum_damage_is_one(self):
        req = BossDamageRequest(damage=1)
        resp = self.engine.apply_damage(req)
        assert resp.actual_damage == 1

    def test_phase_transition_at_50_percent(self):
        # Deal enough damage to cross 50% threshold (2500 * 0.5 = 1250)
        # Need 1250 HP of actual damage. With 22 defense: need many hits.
        # Set HP directly for test clarity.
        self.engine._state.current_hp = 1300  # type: ignore[union-attr]
        req = BossDamageRequest(damage=100)
        resp = self.engine.apply_damage(req)
        # 100 - 22 = 78, 1300 - 78 = 1222 which is < 1250
        assert resp.phase_changed is True
        assert resp.new_phase == BossPhase.PHASE_2
        assert resp.boss_state.is_enraged is True

    def test_phase_transition_only_happens_once(self):
        self.engine._state.current_hp = 1300  # type: ignore[union-attr]
        req = BossDamageRequest(damage=100)
        self.engine.apply_damage(req)  # Triggers phase transition
        # Hit again
        resp = self.engine.apply_damage(req)
        assert resp.phase_changed is False

    def test_void_immune_in_phase_2(self):
        # Force to phase 2
        self.engine._state.phase = BossPhase.PHASE_2  # type: ignore[union-attr]
        self.engine._state.phase_transitioned = True  # type: ignore[union-attr]
        req = BossDamageRequest(damage=100, element=Element.VOID)
        resp = self.engine.apply_damage(req)
        assert resp.actual_damage == 0

    def test_boss_death(self):
        self.engine._state.current_hp = 50  # type: ignore[union-attr]
        self.engine._state.phase = BossPhase.PHASE_2  # type: ignore[union-attr]
        self.engine._state.phase_transitioned = True  # type: ignore[union-attr]
        req = BossDamageRequest(damage=200)
        resp = self.engine.apply_damage(req)
        assert resp.boss_state.current_hp == 0
        assert resp.boss_state.ai_state == BossStateType.DEAD


class TestBossEngineVulnerability:
    """Test the vulnerability/recovery window mechanic."""

    def setup_method(self):
        self.engine = BossEngine()
        self.engine.start_fight(
            BossStartRequest(
                player_level=10,
                player_stats={"attack": 50, "defense": 20},
            )
        )

    def test_vulnerability_window_bonus_damage(self):
        self.engine.set_recovery()
        assert self.engine.state.is_vulnerable is True  # type: ignore[union-attr]

        req = BossDamageRequest(damage=100)
        resp = self.engine.apply_damage(req)
        # (100 - 22) * 1.5 = 117
        assert resp.actual_damage == 117
        assert resp.vulnerability_bonus is True

    def test_end_recovery_clears_vulnerability(self):
        self.engine.set_recovery()
        self.engine.end_recovery()
        assert self.engine.state.is_vulnerable is False  # type: ignore[union-attr]
        assert self.engine.state.ai_state == BossStateType.IDLE  # type: ignore[union-attr]


class TestBossEngineAttackSelection:
    """Test boss attack selection logic."""

    def setup_method(self):
        self.engine = BossEngine()
        self.engine.start_fight(
            BossStartRequest(
                player_level=10,
                player_stats={"attack": 50, "defense": 20},
            )
        )

    def test_selects_attack_from_phase_1(self):
        from app.models.boss_schemas import BossAttackRequest

        req = BossAttackRequest(
            player_position={"x": 400, "y": 400},
            elapsed_ms=5000,
        )
        resp = self.engine.select_attack(req)
        assert resp.attack.attack_type in [
            BossAttackType.GROUND_SLAM,
            BossAttackType.SHADOW_BOLT,
        ]
        assert resp.boss_state.ai_state == BossStateType.TELEGRAPH

    def test_minion_summon_at_75_percent(self):
        from app.models.boss_schemas import BossAttackRequest

        self.engine._state.current_hp = int(2500 * 0.74)  # type: ignore[union-attr]
        req = BossAttackRequest(
            player_position={"x": 400, "y": 400},
            elapsed_ms=5000,
        )
        resp = self.engine.select_attack(req)
        assert resp.attack.attack_type == BossAttackType.SUMMON_MINIONS
        assert resp.boss_state.minions_summoned is True
        assert resp.boss_state.minions_alive == 2

    def test_minion_summon_only_once(self):
        from app.models.boss_schemas import BossAttackRequest

        self.engine._state.current_hp = int(2500 * 0.74)  # type: ignore[union-attr]
        req = BossAttackRequest(
            player_position={"x": 400, "y": 400},
            elapsed_ms=5000,
        )
        self.engine.select_attack(req)
        # Second call should not summon again
        resp = self.engine.select_attack(req)
        assert resp.attack.attack_type != BossAttackType.SUMMON_MINIONS


class TestBossEngineLoot:
    """Test loot generation on boss defeat."""

    def setup_method(self):
        self.engine = BossEngine()
        self.engine.start_fight(
            BossStartRequest(
                player_level=10,
                player_stats={"attack": 50, "defense": 20},
            )
        )
        # Kill the boss
        self.engine._state.current_hp = 0  # type: ignore[union-attr]
        self.engine._state.ai_state = BossStateType.DEAD  # type: ignore[union-attr]

    def test_loot_contains_guaranteed_legendary(self):
        resp = self.engine.generate_loot()
        legendary_items = [
            item for item in resp.loot if item.rarity == "legendary"
        ]
        assert len(legendary_items) >= 1
        assert any(
            item.id == "guardians_molten_core" for item in legendary_items
        )

    def test_loot_contains_xp_reward(self):
        resp = self.engine.generate_loot()
        assert resp.xp_reward == 500

    def test_loot_total_damage_tracked(self):
        resp = self.engine.generate_loot()
        assert resp.total_damage_dealt >= 0


class TestBossEngineErrorHandling:
    """Test error handling edge cases."""

    def test_damage_before_start_raises(self):
        engine = BossEngine()
        req = BossDamageRequest(damage=100)
        with pytest.raises(ValueError, match="not been started"):
            engine.apply_damage(req)

    def test_damage_after_death_raises(self):
        engine = BossEngine()
        engine.start_fight(
            BossStartRequest(
                player_level=10,
                player_stats={"attack": 50},
            )
        )
        engine._state.ai_state = BossStateType.DEAD  # type: ignore[union-attr]
        req = BossDamageRequest(damage=100)
        with pytest.raises(ValueError, match="already dead"):
            engine.apply_damage(req)


# ---------------------------------------------------------------------------
# Integration tests — API endpoints
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_boss_start_endpoint(client):
    payload = {
        "player_level": 10,
        "player_stats": {"attack": 50, "defense": 20, "critical_rate": 0.1},
    }
    response = await client.post("/api/v1/boss/start", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["boss_state"]["current_hp"] == 2500
    assert data["boss_state"]["phase"] == "phase_1"
    assert data["arena_config"]["diameter"] == 800


@pytest.mark.anyio
async def test_boss_damage_endpoint(client):
    # Start fight first
    await client.post(
        "/api/v1/boss/start",
        json={"player_level": 10, "player_stats": {"attack": 50}},
    )
    # Deal damage
    payload = {"damage": 100, "element": None, "is_critical": False}
    response = await client.post("/api/v1/boss/damage", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["actual_damage"] == 78  # 100 - 22 defense
    assert data["boss_state"]["current_hp"] == 2500 - 78


@pytest.mark.anyio
async def test_boss_fire_immune_endpoint(client):
    await client.post(
        "/api/v1/boss/start",
        json={"player_level": 10, "player_stats": {"attack": 50}},
    )
    payload = {"damage": 100, "element": "fire"}
    response = await client.post("/api/v1/boss/damage", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["actual_damage"] == 0


@pytest.mark.anyio
async def test_boss_next_attack_endpoint(client):
    await client.post(
        "/api/v1/boss/start",
        json={"player_level": 10, "player_stats": {"attack": 50}},
    )
    payload = {"player_position": {"x": 400, "y": 400}, "elapsed_ms": 5000}
    response = await client.post("/api/v1/boss/next-attack", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["attack"]["attack_type"] in ["ground_slam", "shadow_bolt"]


@pytest.mark.anyio
async def test_boss_recovery_endpoint(client):
    await client.post(
        "/api/v1/boss/start",
        json={"player_level": 10, "player_stats": {"attack": 50}},
    )
    response = await client.post("/api/v1/boss/recovery")
    assert response.status_code == 200
    data = response.json()
    assert data["boss_state"]["is_vulnerable"] is True


@pytest.mark.anyio
async def test_boss_end_recovery_endpoint(client):
    await client.post(
        "/api/v1/boss/start",
        json={"player_level": 10, "player_stats": {"attack": 50}},
    )
    await client.post("/api/v1/boss/recovery")
    response = await client.post("/api/v1/boss/end-recovery")
    assert response.status_code == 200
    data = response.json()
    assert data["boss_state"]["is_vulnerable"] is False


@pytest.mark.anyio
async def test_boss_loot_requires_defeat(client):
    await client.post(
        "/api/v1/boss/start",
        json={"player_level": 10, "player_stats": {"attack": 50}},
    )
    response = await client.get("/api/v1/boss/loot")
    assert response.status_code == 400


@pytest.mark.anyio
async def test_boss_state_endpoint(client):
    await client.post(
        "/api/v1/boss/start",
        json={"player_level": 10, "player_stats": {"attack": 50}},
    )
    response = await client.get("/api/v1/boss/state")
    assert response.status_code == 200
    data = response.json()
    assert data["boss_state"]["boss_id"] == "corrupted_guardian"


@pytest.mark.anyio
async def test_boss_state_before_start(client):
    response = await client.get("/api/v1/boss/state")
    assert response.status_code == 400
