from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Checkout / Stripe
# ---------------------------------------------------------------------------

class CheckoutCreateRequest(BaseModel):
    user_id: str
    item_type: str
    item_id: str
    price_id: str | None = None
    amount: int | None = None


class CheckoutCreateResponse(BaseModel):
    session_id: str
    checkout_url: str


# ---------------------------------------------------------------------------
# Receipt Validation (Apple / Google)
# ---------------------------------------------------------------------------

class ReceiptVerifyRequest(BaseModel):
    platform: str = Field(pattern=r"^(apple|google)$")
    receipt_data: str
    user_id: str


class ReceiptVerifyResponse(BaseModel):
    valid: bool
    transaction_id: str | None = None
    item_type: str | None = None


# ---------------------------------------------------------------------------
# Battle Pass
# ---------------------------------------------------------------------------

class BattlePassInfo(BaseModel):
    season_id: str
    name: str
    start_date: str
    end_date: str
    total_tiers: int = 100
    weeks: int
    is_active: bool


class BattlePassProgressSchema(BaseModel):
    user_id: str
    season_id: str
    tier: int
    xp: int
    is_premium: bool
    claimed_tiers: list[int]
    rewards_available: list[dict]


class ClaimRewardRequest(BaseModel):
    tier: int


class ClaimRewardResponse(BaseModel):
    success: bool
    reward: dict
    new_tier: int
