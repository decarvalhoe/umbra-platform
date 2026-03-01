from fastapi import APIRouter, Request

from app.models.schemas import AnomalyEvalRequest, AnomalyEvalResponse

router = APIRouter(prefix="/api/v1/anomaly", tags=["anomaly"])


@router.post("/evaluate", response_model=AnomalyEvalResponse)
async def evaluate_anomaly(body: AnomalyEvalRequest, request: Request):
    detector = request.app.state.anomaly_detector
    return detector.evaluate(body)
