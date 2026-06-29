"""
Type classifier utility to load and use the trained type classifier model.
Classifies transactions as debit (1) or credit (0).
"""

import joblib
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Singleton model instance
_type_classifier_model = None
_model_loaded = False


def load_type_classifier_model():
    """Load the trained type classifier model. Cached after first load."""
    global _type_classifier_model, _model_loaded
    
    if _model_loaded:
        return _type_classifier_model
    
    model_path = Path(__file__).parent / 'models' / 'type_classifier.joblib'
    
    if not model_path.exists():
        logger.warning(f"Type classifier model not found at {model_path}")
        return None
    
    try:
        _type_classifier_model = joblib.load(model_path)
        _model_loaded = True
        logger.info(f"Type classifier model loaded from {model_path}")
        return _type_classifier_model
    except Exception as e:
        logger.error(f"Error loading type classifier model: {e}")
        return None


def reload_type_classifier_model():
    """Force reload the trained type classifier model."""
    global _type_classifier_model, _model_loaded
    _type_classifier_model = None
    _model_loaded = False
    return load_type_classifier_model()


def classify_transaction_type(email_body: str) -> dict:
    """
    Classify a transaction email as debit (1) or credit (0).
    
    Args:
        email_body: Raw transaction email text
    
    Returns:
        {
            'label': 0 or 1,
            'type': 'credit' or 'debit',
            'confidence': float (0.0-1.0),
            'probabilities': {'credit': float, 'debit': float}
        }
    """
    model = load_type_classifier_model()
    if model is None:
        return {
            'label': None,
            'type': None,
            'confidence': 0.0,
            'error': 'Type classifier model not loaded',
            'probabilities': {}
        }
    
    try:
        # Predict label and probabilities
        label = int(model.predict([email_body])[0])
        proba = model.predict_proba([email_body])[0]
        confidence = float(max(proba))
        
        return {
            'label': label,
            'type': 'debit' if label == 1 else 'credit',
            'confidence': confidence,
            'probabilities': {
                'credit': float(proba[0]),
                'debit': float(proba[1])
            }
        }
    except Exception as e:
        logger.error(f"Error classifying transaction type: {e}")
        return {
            'label': None,
            'type': None,
            'confidence': 0.0,
            'error': str(e),
            'probabilities': {}
        }
