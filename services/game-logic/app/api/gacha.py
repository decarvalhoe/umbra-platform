from fastapi import APIRouter, Request

from app.models.schemas import GachaPool, GachaDrawRequest, GachaDrawResponse

router = APIRouter(prefix="/api/v1/gacha", tags=["gacha"])


@router.get("/pools", response_model=list[GachaPool])
async def list_pools(request: Request):
    gacha = request.app.state.gacha_system
    return gacha.get_pools()


@router.post("/draw", response_model=GachaDrawResponse)
async def draw(body: GachaDrawRequest, request: Request):
    gacha = request.app.state.gacha_system
    return gacha.draw(body)
