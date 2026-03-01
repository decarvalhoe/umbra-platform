from fastapi import APIRouter, Request

from app.config import settings
from app.models.schemas import (
    CheckoutCreateRequest,
    CheckoutCreateResponse,
    ReceiptVerifyRequest,
    ReceiptVerifyResponse,
)

router = APIRouter(prefix="/api/v1/checkout", tags=["checkout"])


@router.post("/create-session", response_model=CheckoutCreateResponse)
async def create_checkout_session(body: CheckoutCreateRequest, request: Request):
    stripe_service = request.app.state.stripe_service
    success_url = f"{settings.frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{settings.frontend_url}/payment/cancel"
    return await stripe_service.create_checkout_session(
        body, success_url=success_url, cancel_url=cancel_url
    )


@router.post("/verify-receipt", response_model=ReceiptVerifyResponse)
async def verify_receipt(body: ReceiptVerifyRequest, request: Request):
    validator = request.app.state.receipt_validator
    return await validator.validate(body)
