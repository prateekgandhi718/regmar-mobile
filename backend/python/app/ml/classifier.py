"""
Classifier utility to load and use the trained email classifier model.
"""

import joblib
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Singleton model instance
_classifier_model = None
_model_loaded = False


def load_classifier_model():
    """Load the trained classifier model. Cached after first load."""
    global _classifier_model, _model_loaded
    
    if _model_loaded:
        return _classifier_model
    
    model_path = Path(__file__).parent / 'models' / 'email_classifier.joblib'
    
    if not model_path.exists():
        logger.warning(f"Classifier model not found at {model_path}")
        return None
    
    try:
        _classifier_model = joblib.load(model_path)
        _model_loaded = True
        logger.info(f"Classifier model loaded from {model_path}")
        return _classifier_model
    except Exception as e:
        logger.error(f"Error loading classifier model: {e}")
        return None


def reload_classifier_model():
    """Force reload the trained classifier model."""
    global _classifier_model, _model_loaded
    _classifier_model = None
    _model_loaded = False
    return load_classifier_model()


def classify_email_func(email_body: str) -> dict:
    """
    Classify an email as transaction (1) or non-transaction (0).
    
    Args:
        email_body: Raw email text to classify
    
    Returns:
        {
            'label': 0 or 1,
            'is_transaction': bool,
            'confidence': float (0.0-1.0),
            'probabilities': {'non_transaction': float, 'transaction': float}
        }
    """
    model = load_classifier_model()
    if model is None:
        return {
            'label': None,
            'is_transaction': None,
            'confidence': 0.0,
            'error': 'Classifier model not loaded',
            'probabilities': {}
        }
    
    try:
        # Predict label and probabilities
        label = int(model.predict([email_body])[0])
        proba = model.predict_proba([email_body])[0]
        confidence = float(max(proba))
        
        return {
            'label': label,
            'is_transaction': label == 1,
            'confidence': confidence,
            'probabilities': {
                'non_transaction': float(proba[0]),
                'transaction': float(proba[1])
            }
        }
    except Exception as e:
        logger.error(f"Error classifying email: {e}")
        return {
            'label': None,
            'is_transaction': None,
            'confidence': 0.0,
            'error': str(e),
            'probabilities': {}
        }
