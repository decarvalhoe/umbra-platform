import pytest


@pytest.mark.anyio
async def test_generate_quest(client):
    payload = {
        "player_level": 10,
        "player_class": "shadow_knight",
        "current_zone": "Abyssal Depths",
        "difficulty": "normal",
    }
    response = await client.post("/api/v1/generate/quest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "quest_id" in data
    assert data["title"] == "Test Quest"
    assert isinstance(data["objectives"], list)
    assert len(data["objectives"]) >= 1
    assert isinstance(data["rewards"], dict)
    assert data["difficulty"] == "normal"


@pytest.mark.anyio
async def test_generate_dungeon(client):
    payload = {
        "floor_level": 5,
        "corruption": 0.3,
        "player_level": 10,
        "rune_cards": ["fire_rune", "shadow_rune"],
    }
    response = await client.post("/api/v1/generate/dungeon", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "layout_id" in data
    assert isinstance(data["rooms"], list)
    assert len(data["rooms"]) >= 1
    assert isinstance(data["enemies"], list)
    assert isinstance(data["corruption_effects"], list)


@pytest.mark.anyio
async def test_generate_narrative_event(client):
    payload = {
        "event_type": "encounter",
        "player_context": {"level": 10, "class": "mage"},
        "current_zone": "Crimson Wastes",
    }
    response = await client.post("/api/v1/generate/narrative-event", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "event_id" in data
    assert isinstance(data["narrative"], str)
    assert len(data["narrative"]) > 0
    assert isinstance(data["choices"], list)
    assert len(data["choices"]) >= 1
    for choice in data["choices"]:
        assert "label" in choice
        assert "consequence" in choice
        assert "risk_level" in choice
