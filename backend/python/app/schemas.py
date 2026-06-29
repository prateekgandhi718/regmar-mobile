from typing import List, Dict, Optional, Tuple

from pydantic import BaseModel


class OptimizeRequest(BaseModel):
    tickers: List[str]
    period: Optional[str] = "5y"
    riskFreeRate: float = 0.03


class OptimizeResponse(BaseModel):
    allocations: Dict[str, float]
    metrics: Dict[str, float]


class ClassifyEmailRequest(BaseModel):
    """Request body for email classification."""
    email_body: str


class ClassifyEmailResponse(BaseModel):
    """Response for email classification."""
    label: Optional[int]  # 0 = non-transaction, 1 = transaction
    is_transaction: Optional[bool]
    confidence: float
    probabilities: Dict
    error: Optional[str] = None


class ClassifyTransactionTypeRequest(BaseModel):
    """Request body for transaction type classification."""
    email_body: str


class ClassifyTransactionTypeResponse(BaseModel):
    """Response for transaction type classification."""
    label: Optional[int]  # 0 = credit, 1 = debit
    type: Optional[str]  # 'credit' or 'debit'
    confidence: float
    probabilities: Dict
    error: Optional[str] = None


class EntityData(BaseModel):
    """Single extracted entity."""
    text: str
    label: str  # 'AMOUNT' or 'MERCHANT'
    start: int
    end: int


class ExtractEntitiesRequest(BaseModel):
    """Request body for NER entity extraction."""
    email_body: str


class ExtractEntitiesResponse(BaseModel):
    """Response for NER entity extraction."""
    text: str
    entities: List[EntityData]
    model_version: Optional[str] = None
    error: Optional[str] = None

# schemas for retraining.
class NerTrainingSample(BaseModel):
    text: str
    entities: List[Tuple[int, int, str]]

class RetrainNerRequest(BaseModel):
    samples: List[NerTrainingSample]

class RetrainNerResponse(BaseModel):
    success: bool
    samples_added: int
    message: str

# schemas for classifier retraining.
class ClassifierTrainingSample(BaseModel):
    text: str
    label: int
    source_domain: str

class TypeClassifierTrainingSample(BaseModel):
    text: str
    label: int
    source_domain: str
    type: str  # 'credit' or 'debit'

class RetrainClassifierRequest(BaseModel):
    samples: List[ClassifierTrainingSample]

class RetrainClassifierResponse(BaseModel):
    success: bool
    samples_added: int
    message: str

class RetrainTypeClassifierRequest(BaseModel):
    samples: List[TypeClassifierTrainingSample]

class RetrainTypeClassifierResponse(BaseModel):
    success: bool
    samples_added: int
    message: str
