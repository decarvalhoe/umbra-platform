import pytest

from app.models.schemas import Element
from app.services.combat_engine import CombatEngine


class TestElementMultipliers:
    """Test the elemental advantage matrix."""

    def setup_method(self):
        self.engine = CombatEngine()

    def test_fire_beats_shadow(self):
        mult = self.engine._get_element_multiplier(Element.FIRE, Element.SHADOW)
        assert mult == 1.5

    def test_shadow_beats_blood(self):
        mult = self.engine._get_element_multiplier(Element.SHADOW, Element.BLOOD)
        assert mult == 1.5

    def test_blood_beats_void(self):
        mult = self.engine._get_element_multiplier(Element.BLOOD, Element.VOID)
        assert mult == 1.5

    def test_void_beats_fire(self):
        mult = self.engine._get_element_multiplier(Element.VOID, Element.FIRE)
        assert mult == 1.5

    def test_reverse_matchup_disadvantage(self):
        mult = self.engine._get_element_multiplier(Element.SHADOW, Element.FIRE)
        assert mult == 0.75

    def test_same_element_neutral(self):
        mult = self.engine._get_element_multiplier(Element.FIRE, Element.FIRE)
        assert mult == 1.0

    def test_none_element_neutral(self):
        mult = self.engine._get_element_multiplier(None, Element.FIRE)
        assert mult == 1.0

    def test_both_none_neutral(self):
        mult = self.engine._get_element_multiplier(None, None)
        assert mult == 1.0


@pytest.mark.anyio
async def test_resolve_combat_endpoint(client):
    payload = {
        "attacker_stats": {"attack": 50, "critical_rate": 0.0},
        "defender_stats": {"defense": 10, "element": "shadow"},
        "action_type": "attack",
        "element": "fire",
        "combo_multiplier": 1.0,
        "is_dual_wield": False,
    }
    response = await client.post("/api/v1/combat/resolve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "damage" in data
    assert data["damage"] > 0
    assert "element_bonus" in data
    # Fire vs Shadow = 1.5, so element_bonus = 0.5
    assert data["element_bonus"] == 0.5


@pytest.mark.anyio
async def test_calculate_damage_endpoint(client):
    payload = {
        "base_damage": 100,
        "attacker_element": "blood",
        "defender_element": "void",
        "critical_rate": 0.0,
        "dual_wield_bonus": 0.0,
    }
    response = await client.post("/api/v1/combat/calculate-damage", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Blood > Void = 1.5x
    assert data["final_damage"] == 150
    assert data["element_multiplier"] == 1.5
    assert data["is_critical"] is False
