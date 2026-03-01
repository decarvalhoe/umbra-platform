import pytest


@pytest.mark.anyio
async def test_evaluate_session(client):
    payload = {
        "session_stats": {
            "duration_minutes": 45,
            "deaths": 2,
            "enemies_killed": 35,
            "floors_cleared": 3,
        },
        "player_profile": {
            "level": 15,
            "class": "blood_mage",
            "play_style": "aggressive",
        },
        "recent_actions": ["cleared_boss", "used_ultimate", "picked_up_rune"],
    }
    response = await client.post("/api/v1/director/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "difficulty_adjustment" in data
    assert -1.0 <= data["difficulty_adjustment"] <= 1.0
    assert isinstance(data["recommendations"], list)
    assert len(data["recommendations"]) >= 1
    assert "engagement_score" in data
    assert 0.0 <= data["engagement_score"] <= 1.0


@pytest.mark.anyio
async def test_recommend_content(client):
    payload = {
        "player_id": "player_123",
        "player_level": 20,
        "play_style": "explorer",
        "recent_content": ["quest_alpha", "dungeon_beta"],
    }
    response = await client.post("/api/v1/director/recommend-content", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["recommendations"], list)
    assert len(data["recommendations"]) >= 1
    for rec in data["recommendations"]:
        assert "content_type" in rec
        assert "content_id" in rec
        assert "reason" in rec
        assert "priority" in rec
