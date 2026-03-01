from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/api/v1/webhook", tags=["webhook"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle incoming Stripe webhook events.

    Reads the raw request body and verifies the Stripe signature
    before processing the event.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    stripe_service = request.app.state.stripe_service

    try:
        result = await stripe_service.handle_webhook(payload, sig_header)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"received": True, **result}
