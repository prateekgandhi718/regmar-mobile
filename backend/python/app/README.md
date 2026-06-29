# ML Models Training Pipeline

Complete guide for training all ML models from data collection to final model deployment. This covers:
- Email classifier (transaction vs non-transaction)
- Transaction type classifier (debit vs credit)
- NER model (entity extraction: AMOUNT, MERCHANT)

## Prerequisites

```bash
# Navigate to the backend directory
cd backend

# Install all dependencies (uses pyproject.toml)
uv sync
```

---

## Phase 1: Email Classifier (Transaction Detection)

### Step 1A: Fetch Raw Emails from Gmail (TypeScript)

Use the email collection script to fetch emails from your Gmail account and major bank domains:

```bash
cd backend
npx ts-node scripts/collect_classifier_data.ts \
  your-email@gmail.com \
  your-app-password \
  ml_data/classifier_raw_emails.jsonl
```

**Requirements**:
- Gmail account with IMAP enabled
- [App password](https://support.google.com/accounts/answer/185833) (16 characters, no spaces)

**Output**: `ml_data/classifier_raw_emails.jsonl`

**Format**: JSONL with `{"fromEmail": "...", "emailBody": "...", "label": null}`

### Step 1B: Prelabel Data Using Heuristics (Optional)

Use heuristics to pre-label emails as transaction (1) or non-transaction (0):

```bash
cd backend
python python/scripts/prelabel_classifier_data.py \
  ml_data/classifier_raw_emails.jsonl \
  ml_data/classifier_labeled.jsonl
```

**Output**: `ml_data/classifier_labeled.jsonl`

**Next**: Manually review and correct labels in `classifier_labeled.jsonl` before training.

### Step 1C: Create CSV from Labeled Data

Convert JSONL to CSV for training:

```bash
cd backend
python python/scripts/create_classifier_csv.py \
  ml_data/classifier_labeled.jsonl \
  ml_data/classifier_data.csv
```

**Output**: `ml_data/classifier_data.csv`

**Format**: `text,label,source_domain`

### Step 1D: Train Email Classifier

Train the classifier (TF-IDF + Logistic Regression):

```bash
cd backend/python
uv run app/ml/train_classifier.py ../ml_data/classifier_data.csv
```

**Outputs**:
- `app/ml/models/email_classifier.joblib`
- `app/ml/models/classifier_metadata.json` (metrics)

---

## Phase 2: Transaction Type Classifier (Debit vs Credit)

### Step 2A: Extract Transactions and Prelabel by Type

Filter classifier data to keep only transactions (label=1) and add heuristic labels for debit vs credit:

```bash
cd backend
python python/scripts/prelabel_type_classifier_data.py \
  ml_data/classifier_labeled.jsonl \
  ml_data/type_classifier_labeled.jsonl
```

**Output**: `ml_data/type_classifier_labeled.jsonl`

**Next**: Manually review and correct debit/credit labels before training.

### Step 2B: Create CSV from Type Classifier Data

Convert to CSV format:

```bash
cd backend
python python/scripts/create_type_classifier_csv.py \
  ml_data/type_classifier_labeled.jsonl \
  ml_data/type_classifier_data.csv
```

**Output**: `ml_data/type_classifier_data.csv`

**Format**: `text,label,source_domain,type`

### Step 2C: Train Type Classifier

Train the type classifier:

```bash
cd backend/python
uv run app/ml/train_type_classifier.py ../ml_data/type_classifier_data.csv
```

**Outputs**:
- `app/ml/models/type_classifier.joblib`
- `app/ml/models/type_classifier_metadata.json` (metrics)

---

## Phase 3: NER Model (Named Entity Recognition)

### Step 3A: Export Annotated Data from Label Studio

Export your annotated dataset from Label Studio as JSON:
- Download format: **JSON**
- Save to: `backend/ml_data/ner_mvp_annotated_dataset.json`

### Step 3B: Convert Label Studio to spaCy Format

Convert Label Studio annotations to spaCy-compatible JSONL:

```bash
cd backend
python python/scripts/convert_labelstudio_to_spacy_direct.py
```

**Output**: `python/app/ml/data/ner_spacy.jsonl`

### Step 3C: Create DocBin from JSONL

Convert JSONL to spaCy DocBin format (required for training):

```bash
cd backend/python
python scripts/create_docbin_from_jsonl.py \
  ../ml_data/ner_spacy.jsonl \
  app/ml/data/ner.spacy
```

**Output**: `app/ml/data/ner.spacy`

### Step 3D: Split Dataset into Train/Dev

Split the dataset into 80% train and 20% dev:

```bash
cd backend/python
uv run app/ml/split.py
```

**Outputs**:
- `app/ml/data/train.spacy` (80%)
- `app/ml/data/dev.spacy` (20%)

### Step 3E: Generate spaCy Config (One-time)

Create a config file for training (CPU-optimized):

```bash
cd backend/python/app
uv run spacy init config config.cfg \
  --lang en \
  --pipeline ner \
  --optimize efficiency
```

**Output**: `app/config.cfg`

**Note**: For GPU training or transformer-based models:
```bash
# Install transformers support (if not already in pyproject.toml)
uv run pip install spacy-transformers

# Re-run with accuracy optimization
uv run spacy init config config.cfg \
  --lang en \
  --pipeline ner \
  --optimize accuracy
```

### Step 3F: Train NER Model using spaCy CLI

Train the NER model with validation on dev set:

```bash
cd backend/python/app
uv run spacy train config.cfg \
  --output models \
  --paths.train data/train.spacy \
  --paths.dev data/dev.spacy
```

**Optional**: For GPU acceleration:
```bash
uv run spacy train config.cfg \
  --output models \
  --paths.train data/train.spacy \
  --paths.dev data/dev.spacy \
  --gpu-id 0
```

**Outputs**:
- `app/ml/models/ner_v*/model-best/` (best model based on dev performance)
- `app/ml/models/ner_v*/model-last/` (final epoch model)
- `app/ml/models/ner_v*/training/` (training metrics)

---

## Complete Pipeline (Quick Reference)

Run all steps in order:

```bash
# Phase 1: Email Classifier
cd backend
npx ts-node scripts/collect_classifier_data.ts your-email@gmail.com your-app-password ml_data/classifier_raw_emails.jsonl
python python/scripts/prelabel_classifier_data.py ml_data/classifier_raw_emails.jsonl ml_data/classifier_labeled.jsonl
python python/scripts/create_classifier_csv.py ml_data/classifier_labeled.jsonl ml_data/classifier_data.csv
cd python
uv run app/ml/train_classifier.py ../ml_data/classifier_data.csv

# Phase 2: Type Classifier
cd ..
python python/scripts/prelabel_type_classifier_data.py ml_data/classifier_labeled.jsonl ml_data/type_classifier_labeled.jsonl
python python/scripts/create_type_classifier_csv.py ml_data/type_classifier_labeled.jsonl ml_data/type_classifier_data.csv
cd python
uv run app/ml/train_type_classifier.py ../ml_data/type_classifier_data.csv

# Phase 3: NER Model
cd ..
python python/scripts/convert_labelstudio_to_spacy_direct.py
cd python
python scripts/create_docbin_from_jsonl.py ../ml_data/ner_spacy.jsonl app/ml/data/ner.spacy
uv run app/ml/split.py
cd app
uv run spacy init config config.cfg --lang en --pipeline ner --optimize efficiency
uv run spacy train config.cfg --output models --paths.train data/train.spacy --paths.dev data/dev.spacy
```

---

## Model Usage

Once trained, models are automatically loaded and used by the API:

```python
from app.ml.ner import extract_entities
from app.ml.classifier import classify_email_func
from app.ml.type_classifier import classify_transaction_type

# NER
result = extract_entities("Your account debited Rs 500 to Blinkit")
# Returns: {
#   'text': '...',
#   'entities': [
#     {'text': '500', 'label': 'AMOUNT', 'start': 25, 'end': 28},
#     {'text': 'Blinkit', 'label': 'MERCHANT', 'start': 32, 'end': 39}
#   ],
#   'error': None
# }

# Email Classifier
result = classify_email_func("Your account debited Rs 500...")
# Returns: {'label': 1, 'is_transaction': True, 'confidence': 0.95}

# Type Classifier
result = classify_transaction_type("Your account debited Rs 500...")
# Returns: {'label': 1, 'type': 'debit', 'confidence': 0.87}
```

---

## Output Structure

Final trained models location:

```
backend/python/app/ml/models/
├── model-best/                      (best NER model)
├── model-last/                      (final NER model)
├── training/                        (NER training logs)
├── email_classifier.joblib          (email classifier)
├── classifier_metadata.json
├── type_classifier.joblib           (type classifier)
└── type_classifier_metadata.json
```

---

## Notes

- **Dependencies**: Use `uv sync` to install all dependencies from `pyproject.toml`
- **Email collection**: Requires Gmail app password (not regular password)
- **Manual labeling**: Pre-labeled data should be manually reviewed before training
- **NER config**: Generated with `--optimize efficiency` for CPU. Use `--optimize accuracy` for better quality (slower)
- **Classifiers**: Use TF-IDF + Logistic Regression for speed and simplicity
- **Data formats**: Ensure all JSONL/CSV files have correct columns and encoding (UTF-8)
- **GPU support**: Add `--gpu-id 0` to spaCy training command if GPU is available
