#!/usr/bin/env python3
"""
Convert Label Studio export directly to spaCy-ready JSONL:
Each output line: {"text": "...", "entities": [[start, end, label], ...]}

Input: ml_data/ner_mvp_annotated_dataset.json
Output: python/app/data/ner_spacy.jsonl
"""
import json
import sys
from pathlib import Path

IN_FILE = Path('ml_data/ner_mvp_annotated_dataset.json')
OUT_FILE = Path('python/app/ml/data/ner_spacy.jsonl')
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

with IN_FILE.open('r') as f:
    data = json.load(f)

count_in = 0
count_out = 0
label_counts = {}

with OUT_FILE.open('w') as fout:
    for task in data:
        count_in += 1
        text = task.get('data', {}).get('text', '')
        annotations = task.get('annotations', [])
        # prefer manual annotations (first completed annotation)
        ents = []
        for ann in annotations:
            for res in ann.get('result', []):
                v = res.get('value', {})
                start = v.get('start')
                end = v.get('end')
                labels = v.get('labels') or v.get('label') or v.get('labels', [])
                if not labels:
                    continue
                label = labels[0]
                if start is None or end is None:
                    continue
                ents.append([start, end, label])
                label_counts[label] = label_counts.get(label, 0) + 1
        if ents:
            out = {'text': text, 'entities': ents}
            fout.write(json.dumps(out) + '\n')
            count_out += 1

print(f"Converted {count_in} tasks -> {count_out} spaCy docs")
print("Label counts:")
for k,v in label_counts.items():
    print(f"  {k}: {v}")
