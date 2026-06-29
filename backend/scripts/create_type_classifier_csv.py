"""
Convert type classifier labeled JSONL to CSV for training.

Input: JSONL with { text, label, source_domain, type }
Output: CSV with columns [text, label, source_domain, type]

Usage:
    python scripts/create_type_classifier_csv.py ml_data/type_classifier_labeled.jsonl ml_data/type_classifier_data.csv
"""

import json
import sys
import csv
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'type_classifier_data.csv'
    
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: {input_file} not found")
        sys.exit(1)
    
    # Ensure output directory exists
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    rows = []
    with open(input_path, 'r') as infile:
        for line in infile:
            record = json.loads(line.strip())
            rows.append({
                'text': record.get('text', ''),
                'label': record.get('label', 1),
                'source_domain': record.get('source_domain', ''),
                'type': record.get('type', ''),
            })
    
    # Write CSV
    with open(output_path, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=['text', 'label', 'source_domain', 'type'])
        writer.writeheader()
        writer.writerows(rows)
    
    # Print summary
    total = len(rows)
    debit_count = sum(1 for r in rows if r['label'] == 1)
    credit_count = sum(1 for r in rows if r['label'] == 0)
    
    print(f"✓ Converted {total} records to CSV")
    print(f"  - Debit (label=1): {debit_count} ({100*debit_count/total:.1f}%)")
    print(f"  - Credit (label=0): {credit_count} ({100*credit_count/total:.1f}%)")
    print(f"✓ Saved to: {output_path}")

if __name__ == '__main__':
    main()
