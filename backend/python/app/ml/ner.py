import spacy
from pathlib import Path
import logging
from typing import Optional

logger = logging.getLogger(__name__)

MODELS_DIR = Path("app/ml/models")

# Singleton cache
_ner_model = None
_loaded_version = None


# ==========================================================
# MODEL DISCOVERY
# ==========================================================

def _get_latest_model_path() -> Optional[Path]:
    """
    Finds the highest ner_vX directory.
    """

    versions = []

    for p in MODELS_DIR.glob("ner_v*"):
        try:
            v = int(p.name.split("_v")[-1])
            versions.append((v, p))
        except ValueError:
            continue

    if not versions:
        return None

    latest_version, latest_dir = max(versions, key=lambda x: x[0])
    return latest_dir / "model-best"


# ==========================================================
# MODEL LOADER (AUTO RELOAD)
# ==========================================================

def load_ner_model():
    """
    Loads latest NER model if not loaded or outdated.
    """

    global _ner_model, _loaded_version

    model_path = _get_latest_model_path()

    if model_path is None or not model_path.exists():
        logger.warning("No trained NER model found")
        return None

    current_version = model_path.parent.name

    # Already loaded newest version
    if _ner_model and _loaded_version == current_version:
        return _ner_model

    try:
        logger.info(f"Loading NER model → {current_version}")

        _ner_model = spacy.load(model_path)
        _loaded_version = current_version

        logger.info("NER model loaded successfully")

        return _ner_model

    except Exception as e:
        logger.error(f"Failed loading NER model: {e}")
        return None


def extract_entities(email_body: str) -> dict:
    if not email_body or not isinstance(email_body, str):
        return {
            'text': email_body,
            'entities': [],
            'error': 'Invalid input: email_body must be a non-empty string'
        }
    
    model = load_ner_model()
    if model is None:
        return {
            'text': email_body,
            'entities': [],
            'error': 'NER model not loaded'
        }
    
    try:
        # Process text with spaCy
        doc = model(email_body)
        
        # Extract entities
        entities = []
        for ent in doc.ents:
            entities.append({
                'text': ent.text,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char
            })
        
        return {
            'text': email_body,
            'entities': entities,
            'model_version': _loaded_version,
            'error': None
        }
    except Exception as e:
        logger.error(f"Error extracting entities: {e}")
        return {
            'text': email_body,
            'entities': [],
            'model_version': _loaded_version,
            'error': str(e)
        }
