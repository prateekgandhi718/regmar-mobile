"""
ML router for classifier, type classifier, and NER endpoints.
"""

from fastapi import APIRouter
from app.schemas import (
    ClassifyEmailRequest, ClassifyEmailResponse,
    ClassifyTransactionTypeRequest, ClassifyTransactionTypeResponse,
    ExtractEntitiesRequest, ExtractEntitiesResponse, RetrainNerRequest, RetrainNerResponse,
    RetrainClassifierRequest, RetrainClassifierResponse,
    RetrainTypeClassifierRequest, RetrainTypeClassifierResponse,
)
from app.controllers.ml import (
    classify_email,
    classify_txn_type,
    extract_ner_entities,
    retrain_ner_model,
    retrain_classifier_model,
    retrain_type_classifier_model,
)

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/classify-email", response_model=ClassifyEmailResponse)
async def classify_email_endpoint(request: ClassifyEmailRequest) -> ClassifyEmailResponse:
    """
    Classify an email as transaction or non-transaction.
    
    Request:
        {
            "email_body": "Rs.1082.00 has been debited..."
        }
    
    Response:
        {
            "label": 1,
            "is_transaction": true,
            "confidence": 0.9523,
            "probabilities": {
                "non_transaction": 0.0477,
                "transaction": 0.9523
            }
        }
    """
    result = classify_email(request.email_body)
    return ClassifyEmailResponse(**result)


@router.post("/classify-txn-type", response_model=ClassifyTransactionTypeResponse)
async def classify_txn_type_endpoint(request: ClassifyTransactionTypeRequest) -> ClassifyTransactionTypeResponse:
    """
    Classify a transaction email as debit or credit.
    
    Request:
        {
            "email_body": "Rs.1082.00 has been debited to account..."
        }
    
    Response:
        {
            "label": 1,
            "type": "debit",
            "confidence": 0.9234,
            "probabilities": {
                "credit": 0.0766,
                "debit": 0.9234
            }
        }
    """
    result = classify_txn_type(request.email_body)
    return ClassifyTransactionTypeResponse(**result)


@router.post("/extract-entities", response_model=ExtractEntitiesResponse)
async def extract_entities_endpoint(request: ExtractEntitiesRequest) -> ExtractEntitiesResponse:
    """
    Extract named entities (AMOUNT, MERCHANT) from an email.
    
    Request:
        {
            "email_body": "Dear Customer, Rs.500.00 has been debited from account to Blinkit on 18-01-26..."
        }
    
    Response:
        {
            "text": "Dear Customer, Rs.500.00...",
            "entities": [
                {
                    "text": "500.00",
                    "label": "AMOUNT",
                    "start": 25,
                    "end": 31
                },
                {
                    "text": "Blinkit",
                    "label": "MERCHANT",
                    "start": 87,
                    "end": 94
                }
            ]
        }
    """
    result = extract_ner_entities(request.email_body)
    return ExtractEntitiesResponse(**result)

@router.post("/retrain", response_model=RetrainNerResponse)
async def retrain_endpoint(request: RetrainNerRequest) -> RetrainNerResponse:
    """
    Append new NER samples and retrain spaCy model.
    """
    result = retrain_ner_model(request.samples)
    return RetrainNerResponse(**result)


@router.post("/retrain-classifier", response_model=RetrainClassifierResponse)
async def retrain_classifier_endpoint(
    request: RetrainClassifierRequest,
) -> RetrainClassifierResponse:
    """
    Append new classifier samples and retrain email classifier.
    """
    result = retrain_classifier_model(request.samples)
    return RetrainClassifierResponse(**result)


@router.post("/retrain-txn-type", response_model=RetrainTypeClassifierResponse)
async def retrain_type_classifier_endpoint(
    request: RetrainTypeClassifierRequest,
) -> RetrainTypeClassifierResponse:
    """
    Append new type classifier samples and retrain transaction type classifier.
    """
    result = retrain_type_classifier_model(request.samples)
    return RetrainTypeClassifierResponse(**result)
