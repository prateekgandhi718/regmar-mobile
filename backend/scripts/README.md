Purpose
-------
This folder contains helper scripts to prepare NER training data (Label Studio -> spaCy) and to create a spaCy DocBin for training.

Files / pipeline
----------------
1. `convert_labelstudio_to_spacy_direct.py`
   - Input: `ml_data/ner_mvp_annotated_dataset.json` (Label Studio export)
   - Output: `python/app/data/ner_spacy.jsonl` (each line: `{ "text": ..., "entities": [[start,end,label], ...] }`)
   - Converts Label Studio export directly into the spaCy-ready JSONL used to build a `DocBin`.

2. `create_docbin_from_jsonl.py`
   - Input: `python/app/data/ner_spacy.jsonl` (or a train/dev file)
   - Output: `python/app/data/ner.spacy` (DocBin binary) or `python/app/data/train.spacy`, `python/app/data/dev.spacy` if you split.
   - This uses spaCy to build a `DocBin` with entity spans aligned and saved for fast training.
