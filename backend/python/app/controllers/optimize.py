from typing import Tuple, Dict

from app.core import run_ultimate_portfolio


def optimize_portfolio(tickers: list, period: str, risk_free_rate: float) -> Tuple[Dict[str, float], tuple]:
    """Controller wrapper around core.run_ultimate_portfolio.

    Returns (weights, performance)
    """
    weights, perf = run_ultimate_portfolio(
        tickers=tickers,
        period=period,
        risk_free_rate=risk_free_rate,
    )
    return weights, perf
