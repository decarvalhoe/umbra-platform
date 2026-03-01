import pytest

from app.models.schemas import GachaDrawRequest
from app.services.gacha_system import GachaSystem


class TestPitySystem:
    """Test the gacha pity mechanic."""

    def test_pity_triggers_at_threshold(self, gacha_pools_file):
        system = GachaSystem(gacha_pools_file)

        # Draw with pity counter at threshold - 1 (threshold is 10 in test pool)
        request = GachaDrawRequest(
            pool_id="test_pool",
            num_draws=1,
            pity_counter=9,  # Next draw is the 10th, hits pity
        )
        result = system.draw(request)

        assert len(result.items) == 1
        assert result.items[0].rarity == "legendary"
        assert result.guaranteed_legendary is True
        assert result.new_pity_counter == 0

    def test_pity_counter_increments(self, gacha_pools_file):
        system = GachaSystem(gacha_pools_file)

        request = GachaDrawRequest(
            pool_id="test_pool",
            num_draws=1,
            pity_counter=0,
        )
        result = system.draw(request)

        # If no legendary was drawn naturally, pity should be 1
        if result.items[0].rarity != "legendary":
            assert result.new_pity_counter == 1

    def test_multiple_draws(self, gacha_pools_file):
        system = GachaSystem(gacha_pools_file)

        request = GachaDrawRequest(
            pool_id="test_pool",
            num_draws=5,
            pity_counter=0,
        )
        result = system.draw(request)

        assert len(result.items) == 5

    def test_unknown_pool_raises(self, gacha_pools_file):
        system = GachaSystem(gacha_pools_file)

        request = GachaDrawRequest(
            pool_id="nonexistent",
            num_draws=1,
            pity_counter=0,
        )
        with pytest.raises(ValueError, match="Unknown gacha pool"):
            system.draw(request)


@pytest.mark.anyio
async def test_list_pools_endpoint(client):
    response = await client.get("/api/v1/gacha/pools")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["id"] == "test_pool"


@pytest.mark.anyio
async def test_draw_endpoint(client):
    payload = {
        "pool_id": "test_pool",
        "num_draws": 1,
        "pity_counter": 0,
    }
    response = await client.post("/api/v1/gacha/draw", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 1
    assert "new_pity_counter" in data
