from fastapi import APIRouter
from app.schemas import OptimizeRequest, OptimizeResponse
from app.controllers.optimize import optimize_portfolio

router = APIRouter()


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize(payload: OptimizeRequest) -> OptimizeResponse:
    if not payload.tickers:
        raise ValueError("tickers must be a non-empty list")
    weights, performance = optimize_portfolio(payload.tickers, payload.period or "5y", payload.riskFreeRate)
    return OptimizeResponse(
        allocations={key: round(value * 100, 2) for key, value in weights.items()},
        metrics={
            "expectedAnnualReturn": round(performance[0], 4),
            "annualVolatility": round(performance[1], 4),
            "sharpeRatio": round(performance[2], 4),
        },
    )
