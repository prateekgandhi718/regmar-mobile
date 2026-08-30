from typing import Dict, Tuple
from app.core import run_ultimate_portfolio


def optimize_portfolio(tickers: list, period: str, risk_free_rate: float) -> Tuple[Dict[str, float], tuple]:
    return run_ultimate_portfolio(tickers=tickers, period=period, risk_free_rate=risk_free_rate)
