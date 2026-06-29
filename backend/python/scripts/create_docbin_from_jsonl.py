#!/usr/bin/env python3
"""
Create a spaCy DocBin (.spacy) from a JSONL where each line is:
{"text": "...", "entities": [[start, end, label], ...]}

Usage:
  python scripts/create_docbin_from_jsonl.py input.jsonl output.spacy
"""
import json
import sys
from pathlib import Path

try:
    import spacy
    from spacy.tokens import DocBin
except Exception as e:
    print("ERROR: spaCy import failed:", e)
    sys.exit(2)

if len(sys.argv) < 3:
    print("Usage: create_docbin_from_jsonl.py input.jsonl output.spacy")
    sys.exit(1)

in_path = Path(sys.argv[1])
out_path = Path(sys.argv[2])

nlp = spacy.blank("en")
docbin = DocBin()
count = 0
warn = 0

with in_path.open('r') as f:
    for line in f:
        obj = json.loads(line)
        text = obj.get('text', '')
        entities = obj.get('entities', [])
        doc = nlp.make_doc(text)
        spans = []
        for ent in entities:
            if len(ent) < 3:
                continue
            start, end, label = ent[0], ent[1], ent[2]
            span = doc.char_span(start, end, label=label, alignment_mode='contract')
            if span is None:
                span = doc.char_span(start, end, label=label, alignment_mode='expand')
            if span is None:
                warn += 1
            else:
                spans.append(span)
        if spans:
            doc.ents = tuple(spans)
        docbin.add(doc)
        count += 1

out_path.parent.mkdir(parents=True, exist_ok=True)
docbin.to_disk(out_path)
print(f"Saved {count} docs to {out_path}; {warn} spans could not be aligned exactly")
