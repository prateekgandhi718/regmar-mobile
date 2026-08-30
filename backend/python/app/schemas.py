from typing import Dict, List, Optional
from pydantic import BaseModel


class OptimizeRequest(BaseModel):
    tickers: List[str]
    period: Optional[str] = "5y"
    riskFreeRate: float = 0.03


class OptimizeResponse(BaseModel):
    allocations: Dict[str, float]
    metrics: Dict[str, float]
