import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.api.combat import router as combat_router
from app.api.gacha import router as gacha_router
from app.api.progression import router as progression_router
from app.api.anomaly import router as anomaly_router
from app.services.combat_engine import CombatEngine
from app.services.gacha_system import GachaSystem
from app.services.progression import ProgressionService
from app.services.anomaly_detector import AnomalyDetector

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.combat_engine = CombatEngine()
    app.state.gacha_system = GachaSystem(settings.gacha_pools_path)
    app.state.progression_service = ProgressionService()
    app.state.anomaly_detector = AnomalyDetector()
    logger.info("Game logic services initialized")
    yield


app = FastAPI(title="Umbra Game Logic", version="1.0.0", lifespan=lifespan)
app.include_router(combat_router)
app.include_router(gacha_router)
app.include_router(progression_router)
app.include_router(anomaly_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "game-logic"}
