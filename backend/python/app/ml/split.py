#!/usr/bin/env python3
import random
from spacy.tokens import DocBin
import spacy

nlp = spacy.blank("en")

doc_bin = DocBin().from_disk("app/ml/data/ner.spacy")
docs = list(doc_bin.get_docs(nlp.vocab))

random.shuffle(docs)

split = int(len(docs) * 0.8)

train_docs = docs[:split]
dev_docs = docs[split:]

DocBin(docs=train_docs).to_disk("app/ml/data/train.spacy")
DocBin(docs=dev_docs).to_disk("app/ml/data/dev.spacy")

print("Split complete")
