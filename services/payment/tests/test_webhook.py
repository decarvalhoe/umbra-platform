from unittest.mock import patch, MagicMock

import pytest
import stripe


@pytest.mark.anyio
async def test_stripe_webhook_checkout_completed(client):
    """Test handling of checkout.session.completed webhook event."""
    mock_event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "amount_total": 999,
                "metadata": {
                    "user_id": "user_abc",
                    "item_type": "battlepass",
                    "item_id": "premium_pass_s1",
                },
            }
        },
    }

    with patch("stripe.Webhook.construct_event", return_value=mock_event):
        response = await client.post(
            "/api/v1/webhook/stripe",
            content=b'{"test": "payload"}',
            headers={"stripe-signature": "test_sig_123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["received"] is True
        assert data["processed"] is True
        assert data["user_id"] == "user_abc"
        assert data["item_type"] == "battlepass"


@pytest.mark.anyio
async def test_stripe_webhook_invalid_signature(client):
    """Test that invalid signatures are rejected."""
    with patch(
        "stripe.Webhook.construct_event",
        side_effect=stripe.error.SignatureVerificationError(
            "Invalid signature", "test_sig"
        ),
    ):
        response = await client.post(
            "/api/v1/webhook/stripe",
            content=b'{"test": "payload"}',
            headers={"stripe-signature": "invalid_sig"},
        )
        assert response.status_code == 400


@pytest.mark.anyio
async def test_stripe_webhook_missing_signature(client):
    """Test that missing signature header returns 400."""
    response = await client.post(
        "/api/v1/webhook/stripe",
        content=b'{"test": "payload"}',
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_stripe_webhook_invoice_paid(client):
    """Test handling of invoice.paid webhook event."""
    mock_event = {
        "type": "invoice.paid",
        "data": {
            "object": {
                "customer": "cus_test_456",
                "subscription": "sub_test_789",
                "amount_paid": 1999,
            }
        },
    }

    with patch("stripe.Webhook.construct_event", return_value=mock_event):
        response = await client.post(
            "/api/v1/webhook/stripe",
            content=b'{"test": "payload"}',
            headers={"stripe-signature": "test_sig_123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["received"] is True
        assert data["processed"] is True
        assert data["customer_id"] == "cus_test_456"
