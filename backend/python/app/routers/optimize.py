from fastapi import APIRouter

from app.schemas import OptimizeRequest, OptimizeResponse
from app.controllers.optimize import optimize_portfolio


router = APIRouter()


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize(payload: OptimizeRequest) -> OptimizeResponse:
    if not payload.tickers:
        # Raise ValueError; global handler converts to JSONResponse
        raise ValueError("tickers must be a non-empty list")

    weights, perf = optimize_portfolio(
        tickers=payload.tickers,
        period=payload.period or "5y",
        risk_free_rate=payload.riskFreeRate,
    )

    allocations = {k: round(v * 100, 2) for k, v in weights.items()}
    metrics = {
        "expectedAnnualReturn": round(perf[0], 4),
        "annualVolatility": round(perf[1], 4),
        "sharpeRatio": round(perf[2], 4),
    }

    return OptimizeResponse(allocations=allocations, metrics=metrics)
