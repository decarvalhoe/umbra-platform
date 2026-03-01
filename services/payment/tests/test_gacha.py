"""Tests pour les fonctionnalités de gacha."""


def _seed_wallet(client, user_id: str, amount: float = 120.0) -> None:
    response = client.post(f"/wallets/{user_id}/topup", json={"amount": amount})
    assert response.status_code == 200


def test_list_pools(client):
    response = client.get("/gacha/pools")
    assert response.status_code == 200
    payload = response.get_json()
    pools = payload["data"]["pools"]
    assert any(pool["name"] == "standard" for pool in pools)


def test_gacha_draw_spends_balance_and_returns_items(client):
    user_id = "gacha-master"
    _seed_wallet(client, user_id, amount=150)

    draw_response = client.post(
        "/gacha/draw",
        json={"user_id": user_id, "pool": "standard", "draws": 3, "seed": 42},
    )
    assert draw_response.status_code == 200

    draw_data = draw_response.get_json()["data"]
    assert draw_data["pool"] == "standard"
    assert draw_data["draws"] == 3
    assert len(draw_data["items"]) == 3
    assert draw_data["remaining_balance"] == 120.0

    wallet_response = client.get(f"/wallets/{user_id}")
    wallet_balance = wallet_response.get_json()["data"]["wallet"]["balance"]
    assert wallet_balance == 120.0


def test_gacha_draw_requires_funds(client):
    response = client.post("/gacha/draw", json={"user_id": "no-money", "draws": 1})
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["message"] == "Fonds insuffisants"

