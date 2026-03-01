import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base
from app.models.db_models import Transaction, Subscription, BattlePassProgress  # noqa: F401
from app.api.checkout import router as checkout_router
from app.api.webhook import router as webhook_router
from app.api.battlepass import router as battlepass_router
from app.services.stripe_service import StripeService
from app.services.receipt_validator import ReceiptValidator

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")

    # Initialize services on app state
    app.state.stripe_service = StripeService()
    app.state.receipt_validator = ReceiptValidator()
    logger.info("Payment services initialized")

    yield

    # Cleanup
    await engine.dispose()


app = FastAPI(title="Umbra Payment Service", version="1.0.0", lifespan=lifespan)
app.include_router(checkout_router)
app.include_router(webhook_router)
app.include_router(battlepass_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "payment"}
