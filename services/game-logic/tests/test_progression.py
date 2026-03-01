import pytest

from app.services.progression import ProgressionService
from app.models.schemas import XPCalcRequest, LevelUpRequest


class TestXPCalculation:
    """Test XP calculation formula."""

    def setup_method(self):
        self.service = ProgressionService()

    def test_basic_xp_calculation(self):
        request = XPCalcRequest(
            enemies_defeated=10,
            floor_level=1,
            combo_count=0,
            time_bonus=0.0,
            corruption_bonus=0.0,
        )
        result = self.service.calculate_xp(request)
        # base = 10 * 25 = 250
        # floor_mult = 1.0 + (1 * 0.1) = 1.1
        # combo_bonus = 0
        # total = 250 * 1.1 * 1.0 * 1.0 = 275
        assert result.xp_earned == 275
        assert "base_xp" in result.breakdown

    def test_xp_with_all_bonuses(self):
        request = XPCalcRequest(
            enemies_defeated=20,
            floor_level=5,
            combo_count=10,
            time_bonus=0.5,
            corruption_bonus=0.3,
        )
        result = self.service.calculate_xp(request)
        # base = 20 * 25 = 500
        # floor_mult = 1.0 + (5 * 0.1) = 1.5
        # combo_bonus = 10 * 0.02 = 0.2
        # total = 500 * 1.5 * 1.2 * 1.5 * 1.3 = 1755
        assert result.xp_earned == 1755


class TestLevelUp:
    """Test level-up mechanics."""

    def setup_method(self):
        self.service = ProgressionService()

    def test_no_level_up(self):
        request = LevelUpRequest(
            current_level=1,
            current_xp=0,
            xp_to_add=100,
        )
        result = self.service.level_up(request)
        # XP for level 2 = 2*2*100 = 400
        assert result.new_level == 1
        assert result.new_xp == 100
        assert result.levels_gained == 0

    def test_single_level_up(self):
        request = LevelUpRequest(
            current_level=1,
            current_xp=0,
            xp_to_add=500,
        )
        result = self.service.level_up(request)
        # XP for level 2 = 400, so after leveling: 500 - 400 = 100 remaining
        assert result.new_level == 2
        assert result.new_xp == 100
        assert result.levels_gained == 1
        # Each stat gets +2 per level gained
        assert result.stat_increases["strength"] == 2
        assert result.stat_increases["agility"] == 2

    def test_multiple_level_ups(self):
        request = LevelUpRequest(
            current_level=1,
            current_xp=0,
            xp_to_add=2000,
        )
        result = self.service.level_up(request)
        # Level 2 = 400, Level 3 = 900 -> 400 + 900 = 1300 needed for 2 levels
        # Level 4 = 1600 -> 1300 + 1600 = 2900 needed for 3 levels (not enough)
        assert result.new_level == 3
        assert result.levels_gained == 2
        assert result.stat_increases["strength"] == 4  # 2 * 2 levels


@pytest.mark.anyio
async def test_calculate_xp_endpoint(client):
    payload = {
        "enemies_defeated": 10,
        "floor_level": 1,
        "combo_count": 5,
        "time_bonus": 0.1,
        "corruption_bonus": 0.0,
    }
    response = await client.post("/api/v1/progression/calculate-xp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["xp_earned"] > 0
    assert "breakdown" in data


@pytest.mark.anyio
async def test_level_up_endpoint(client):
    payload = {
        "current_level": 1,
        "current_xp": 0,
        "xp_to_add": 500,
    }
    response = await client.post("/api/v1/progression/level-up", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["new_level"] == 2
    assert data["levels_gained"] == 1
