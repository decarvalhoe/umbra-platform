"""Tests pour la gestion des portefeuilles."""


def test_wallet_topup_and_spend_flow(client):
    user_id = "joueur-1"

    response = client.post(f"/wallets/{user_id}/topup", json={"amount": 100, "source": "shop"})
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["wallet"]["balance"] == 100.0

    response = client.get(f"/wallets/{user_id}")
    assert response.status_code == 200
    wallet_data = response.get_json()["data"]["wallet"]
    assert wallet_data["balance"] == 100.0

    response = client.post(
        f"/wallets/{user_id}/spend",
        json={"amount": "12.50", "reason": "purchase", "metadata": {"item": "skin"}},
    )
    assert response.status_code == 200
    spend_data = response.get_json()["data"]
    assert spend_data["wallet"]["balance"] == 87.5
    assert spend_data["transaction"]["metadata"]["reason"] == "purchase"

    response = client.get(f"/wallets/{user_id}/transactions")
    transactions_payload = response.get_json()["data"]["transactions"]
    assert len(transactions_payload) == 2
    amounts = sorted(tx["amount"] for tx in transactions_payload)
    assert amounts == [12.5, 100.0]


def test_wallet_prevents_negative_or_invalid_amount(client):
    response = client.post("/wallets/u1/topup", json={"amount": -10})
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["success"] is False

    response = client.post("/wallets/u1/spend", json={"amount": "abc"})
    assert response.status_code == 400


def test_wallet_spend_rejects_when_balance_is_too_low(client):
    user_id = "pauvre-joueur"

    response = client.post(f"/wallets/{user_id}/spend", json={"amount": 5})
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"]["detail"].startswith("Fonds insuffisants")

