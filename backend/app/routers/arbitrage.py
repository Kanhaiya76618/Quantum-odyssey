from fastapi import APIRouter, HTTPException

from app.core.qaoa_solver import solve_arbitrage
from app.models.schemas import ArbitrageRequest, ArbitrageResponse

router = APIRouter()


@router.post("/arbitrage", response_model=ArbitrageResponse)
def run_arbitrage(req: ArbitrageRequest):
    try:
        return solve_arbitrage(
            capital=req.capital,
            steps=req.steps,
            user_rates=req.rates,
            ibm_token=req.ibm_token,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QAOA Hardware Arbitrage execution error: {str(e)}")
