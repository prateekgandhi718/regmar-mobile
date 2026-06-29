from pathlib import Path


MODELS_DIR = Path("app/ml/models")

def get_next_model_dir() -> Path:
    """
    Determine next model version directory.
    Example:
        ner_v1/
        ner_v2/
    """
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    existing_versions = []

    for p in MODELS_DIR.glob("ner_v*"):
        try:
            version = int(p.name.split("_v")[-1])
            existing_versions.append(version)
        except ValueError:
            continue

    next_version = max(existing_versions, default=0) + 1
    return MODELS_DIR / f"ner_v{next_version}"