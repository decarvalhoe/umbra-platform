import logging

import stripe

from app.config import settings
from app.models.schemas import CheckoutCreateRequest, CheckoutCreateResponse

logger = logging.getLogger(__name__)


class StripeService:
    """Handles Stripe checkout sessions and webhook processing."""

    def __init__(self) -> None:
        stripe.api_key = settings.stripe_secret_key

    async def create_checkout_session(
        self,
        request: CheckoutCreateRequest,
        success_url: str,
        cancel_url: str,
    ) -> CheckoutCreateResponse:
        """Create a Stripe Checkout Session for a purchase."""
        line_items: list[dict] = []

        if request.price_id:
            # Use a pre-configured Stripe Price
            line_items.append({"price": request.price_id, "quantity": 1})
        elif request.amount is not None:
            # Create an ad-hoc line item
            line_items.append(
                {
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": request.amount,
                        "product_data": {
                            "name": f"{request.item_type}: {request.item_id}",
                        },
                    },
                    "quantity": 1,
                }
            )
        else:
            raise ValueError("Either price_id or amount must be provided")

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": request.user_id,
                "item_type": request.item_type,
                "item_id": request.item_id,
            },
        )

        return CheckoutCreateResponse(
            session_id=session.id,
            checkout_url=session.url,
        )

    async def handle_webhook(self, payload: bytes, sig_header: str) -> dict:
        """Verify and process a Stripe webhook event.

        Returns a dict with event type and relevant data.
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.stripe_webhook_secret
            )
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid Stripe webhook signature")
            raise ValueError("Invalid webhook signature")

        event_type = event["type"]
        data = event["data"]["object"]

        result = {"event_type": event_type, "processed": False}

        if event_type == "checkout.session.completed":
            metadata = data.get("metadata", {})
            result.update(
                {
                    "processed": True,
                    "user_id": metadata.get("user_id"),
                    "item_type": metadata.get("item_type"),
                    "item_id": metadata.get("item_id"),
                    "session_id": data.get("id"),
                    "amount_total": data.get("amount_total"),
                }
            )
            logger.info(
                "Checkout completed for user %s: %s/%s",
                metadata.get("user_id"),
                metadata.get("item_type"),
                metadata.get("item_id"),
            )

        elif event_type == "invoice.paid":
            result.update(
                {
                    "processed": True,
                    "customer_id": data.get("customer"),
                    "subscription_id": data.get("subscription"),
                    "amount_paid": data.get("amount_paid"),
                }
            )
            logger.info("Invoice paid for customer %s", data.get("customer"))

        elif event_type == "customer.subscription.updated":
            result.update(
                {
                    "processed": True,
                    "customer_id": data.get("customer"),
                    "subscription_id": data.get("id"),
                    "status": data.get("status"),
                    "current_period_end": data.get("current_period_end"),
                }
            )
            logger.info(
                "Subscription %s updated to %s",
                data.get("id"),
                data.get("status"),
            )

        else:
            logger.debug("Unhandled webhook event type: %s", event_type)

        return result
