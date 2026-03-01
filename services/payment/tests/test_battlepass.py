import pytest


@pytest.mark.anyio
async def test_get_current_season(client):
    """Test that current season info is returned."""
    response = await client.get("/api/v1/battlepass/current")
    assert response.status_code == 200
    data = response.json()
    assert "season_id" in data
    assert data["season_id"].startswith("season_")
    assert data["total_tiers"] == 100
    assert data["weeks"] == 10
    assert isinstance(data["is_active"], bool)


@pytest.mark.anyio
async def test_get_progress_creates_new(client):
    """Test that progress is auto-created for new user/season."""
    response = await client.get("/api/v1/battlepass/player_new/progress")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "player_new"
    assert data["tier"] == 0
    assert data["xp"] == 0
    assert data["is_premium"] is False
    assert data["claimed_tiers"] == []


@pytest.mark.anyio
async def test_get_progress_idempotent(client):
    """Test that multiple calls return the same progress."""
    r1 = await client.get("/api/v1/battlepass/player_test/progress")
    r2 = await client.get("/api/v1/battlepass/player_test/progress")
    assert r1.json()["tier"] == r2.json()["tier"]
    assert r1.json()["season_id"] == r2.json()["season_id"]


@pytest.mark.anyio
async def test_claim_reward_no_progress(client):
    """Test claiming reward without existing progress returns 404."""
    payload = {"tier": 1}
    response = await client.post(
        "/api/v1/battlepass/nonexistent_player/claim", json=payload
    )
    assert response.status_code == 404


@pytest.mark.anyio
async def test_claim_reward_tier_too_high(client):
    """Test that claiming a tier above player's current tier fails."""
    # First create progress (tier=0)
    await client.get("/api/v1/battlepass/player_claim_test/progress")

    payload = {"tier": 50}
    response = await client.post(
        "/api/v1/battlepass/player_claim_test/claim", json=payload
    )
    assert response.status_code == 400
    assert "cannot claim tier" in response.json()["detail"].lower()


@pytest.mark.anyio
async def test_claim_reward_no_reward_at_tier(client):
    """Test claiming at a tier that has no reward."""
    # Create progress at tier 0
    await client.get("/api/v1/battlepass/player_no_reward/progress")

    # Tier 0 has no reward defined
    payload = {"tier": 0}
    response = await client.post(
        "/api/v1/battlepass/player_no_reward/claim", json=payload
    )
    assert response.status_code == 400
    assert "no reward" in response.json()["detail"].lower()
