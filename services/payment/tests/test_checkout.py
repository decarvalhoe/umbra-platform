from unittest.mock import patch, MagicMock

import pytest


@pytest.mark.anyio
async def test_create_checkout_session(client):
    """Test checkout session creation with mocked Stripe."""
    mock_session = MagicMock()
    mock_session.id = "cs_test_123"
    mock_session.url = "https://checkout.stripe.com/pay/cs_test_123"

    with patch("stripe.checkout.Session.create", return_value=mock_session):
        payload = {
            "user_id": "user_abc",
            "item_type": "battlepass",
            "item_id": "premium_pass_s1",
            "amount": 999,
        }
        response = await client.post("/api/v1/checkout/create-session", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == "cs_test_123"
        assert "checkout.stripe.com" in data["checkout_url"]


@pytest.mark.anyio
async def test_verify_apple_receipt(client):
    """Test Apple receipt verification (stub)."""
    payload = {
        "platform": "apple",
        "receipt_data": "base64_encoded_receipt_data",
        "user_id": "user_abc",
    }
    response = await client.post("/api/v1/checkout/verify-receipt", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["transaction_id"] is not None


@pytest.mark.anyio
async def test_verify_google_receipt(client):
    """Test Google receipt verification (stub)."""
    payload = {
        "platform": "google",
        "receipt_data": "purchase_token_data",
        "user_id": "user_abc",
    }
    response = await client.post("/api/v1/checkout/verify-receipt", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["transaction_id"] is not None


@pytest.mark.anyio
async def test_invalid_platform_rejected(client):
    """Test that invalid platform is rejected by validation."""
    payload = {
        "platform": "steam",
        "receipt_data": "some_data",
        "user_id": "user_abc",
    }
    response = await client.post("/api/v1/checkout/verify-receipt", json=payload)
    assert response.status_code == 422  # Pydantic validation error
