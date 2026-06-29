# core.py
import yfinance as yf
from pypfopt import EfficientFrontier, expected_returns, risk_models


def run_ultimate_portfolio(
    tickers,
    period="5y",
    risk_free_rate=0.03,
    min_coverage=0.9,
):
    prices = yf.download(
        tickers,
        period=period,
        interval="1d",
        auto_adjust=True,
        progress=False
    )["Close"]

    # Total window length (calendar-aligned)
    total_days = prices.shape[0]
    min_days = int(total_days * min_coverage)

    # Filter tickers with sufficient coverage
    valid_tickers = [
        t for t in prices.columns
        if prices[t].dropna().shape[0] >= min_days
    ]

    if len(valid_tickers) < 2:
        raise ValueError(
            f"Not enough tickers with sufficient history "
            f"(required ≥ {min_days} days)"
        )

    # Keep only valid tickers
    prices = prices[valid_tickers]

    # Align dates AFTER filtering tickers
    prices = prices.dropna()

    # Expected returns & covariance
    mu = expected_returns.mean_historical_return(prices, frequency=252)
    S = risk_models.sample_cov(prices, frequency=252)

    # Optimisation
    ef = EfficientFrontier(mu, S)
    ef.max_sharpe(risk_free_rate=risk_free_rate)

    weights = ef.clean_weights()
    performance = ef.portfolio_performance(risk_free_rate=risk_free_rate)

    return weights, performance